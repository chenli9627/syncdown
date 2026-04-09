import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getPostgresPool } from "@/lib/server/postgres-client";

export type PresenceRecord = {
  anchor: number;
  avatarUrl?: string | null;
  documentId: string;
  head: number;
  name: string;
  updatedAt: string;
  userId: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const PRESENCE_FILE = path.join(DATA_DIR, "presence.json");
const PRESENCE_TTL_MS = 15_000;
const PRESENCE_TABLE = "syncdown_presence";

async function ensurePresenceFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(PRESENCE_FILE, "utf8");
  } catch {
    await writeFile(PRESENCE_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

async function ensurePresenceTable() {
  const client = await getPostgresPool().connect();

  try {
    await client.query(`
      create table if not exists ${PRESENCE_TABLE} (
        document_id text not null,
        user_id text not null,
        anchor integer not null,
        head integer not null,
        name text not null,
        avatar_url text,
        updated_at timestamptz not null default now(),
        primary key (document_id, user_id)
      )
    `);
    await client.query(
      `alter table ${PRESENCE_TABLE} add column if not exists avatar_url text`,
    );
  } finally {
    client.release();
  }
}

async function readPresenceFile() {
  await ensurePresenceFile();
  const raw = await readFile(PRESENCE_FILE, "utf8");

  try {
    return JSON.parse(raw) as PresenceRecord[];
  } catch {
    await writeFile(PRESENCE_FILE, JSON.stringify([], null, 2), "utf8");
    return [];
  }
}

async function writePresenceFile(records: PresenceRecord[]) {
  await ensurePresenceFile();
  await writeFile(PRESENCE_FILE, JSON.stringify(records, null, 2), "utf8");
}

function isFresh(record: PresenceRecord) {
  return Date.now() - new Date(record.updatedAt).getTime() < PRESENCE_TTL_MS;
}

export async function getPresenceForDocument(documentId: string) {
  if (process.env.DATABASE_URL?.trim()) {
    return getPresenceForDocumentFromPostgres(documentId);
  }

  const allRecords = await readPresenceFile();
  const freshRecords = allRecords.filter(isFresh);
  await writePresenceFile(freshRecords);
  return freshRecords.filter((record) => record.documentId === documentId);
}

export async function upsertPresence(record: Omit<PresenceRecord, "updatedAt">) {
  if (process.env.DATABASE_URL?.trim()) {
    return upsertPresenceInPostgres(record);
  }

  const nextRecord: PresenceRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
  };

  const records = (await readPresenceFile()).filter(
    (item) =>
      isFresh(item) &&
      !(item.documentId === record.documentId && item.userId === record.userId),
  );

  records.push(nextRecord);
  await writePresenceFile(records);

  return records.filter((item) => item.documentId === record.documentId);
}

export async function removePresence(documentId: string, userId: string) {
  if (process.env.DATABASE_URL?.trim()) {
    await removePresenceFromPostgres(documentId, userId);
    return;
  }

  const records = (await readPresenceFile()).filter(
    (item) =>
      !(item.documentId === documentId && item.userId === userId) && isFresh(item),
  );

  await writePresenceFile(records);
}

async function getPresenceForDocumentFromPostgres(documentId: string) {
  await ensurePresenceTable();
  const client = await getPostgresPool().connect();

  try {
    await client.query(
      `delete from ${PRESENCE_TABLE} where updated_at < now() - interval '15 seconds'`,
    );
    const result = await client.query<{
      anchor: number;
      avatar_url: string | null;
      head: number;
      name: string;
      updated_at: Date | string;
      user_id: string;
    }>(
      `select anchor, head, name, updated_at, user_id
              , avatar_url
       from ${PRESENCE_TABLE}
       where document_id = $1
       order by updated_at desc`,
      [documentId],
    );

    return result.rows.map((row) => ({
      anchor: row.anchor,
      avatarUrl: row.avatar_url,
      documentId,
      head: row.head,
      name: row.name,
      updatedAt:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : new Date(row.updated_at).toISOString(),
      userId: row.user_id,
    }));
  } finally {
    client.release();
  }
}

async function upsertPresenceInPostgres(record: Omit<PresenceRecord, "updatedAt">) {
  await ensurePresenceTable();
  const client = await getPostgresPool().connect();

  try {
    await client.query(
      `insert into ${PRESENCE_TABLE} (
        document_id,
        user_id,
        anchor,
        head,
        name,
        avatar_url,
        updated_at
      ) values ($1, $2, $3, $4, $5, $6, now())
      on conflict (document_id, user_id)
      do update set
        anchor = excluded.anchor,
        head = excluded.head,
        name = excluded.name,
        avatar_url = excluded.avatar_url,
        updated_at = now()`,
      [
        record.documentId,
        record.userId,
        record.anchor,
        record.head,
        record.name,
        record.avatarUrl ?? null,
      ],
    );

    return getPresenceForDocumentFromPostgres(record.documentId);
  } finally {
    client.release();
  }
}

async function removePresenceFromPostgres(documentId: string, userId: string) {
  await ensurePresenceTable();
  const client = await getPostgresPool().connect();

  try {
    await client.query(
      `delete from ${PRESENCE_TABLE} where document_id = $1 and user_id = $2`,
      [documentId, userId],
    );
  } finally {
    client.release();
  }
}
