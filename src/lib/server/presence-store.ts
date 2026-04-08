import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PresenceRecord = {
  anchor: number;
  documentId: string;
  head: number;
  name: string;
  updatedAt: string;
  userId: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const PRESENCE_FILE = path.join(DATA_DIR, "presence.json");
const PRESENCE_TTL_MS = 15_000;

async function ensurePresenceFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(PRESENCE_FILE, "utf8");
  } catch {
    await writeFile(PRESENCE_FILE, JSON.stringify([], null, 2), "utf8");
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
  const allRecords = await readPresenceFile();
  const freshRecords = allRecords.filter(isFresh);
  await writePresenceFile(freshRecords);
  return freshRecords.filter((record) => record.documentId === documentId);
}

export async function upsertPresence(record: Omit<PresenceRecord, "updatedAt">) {
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
  const records = (await readPresenceFile()).filter(
    (item) =>
      !(item.documentId === documentId && item.userId === userId) && isFresh(item),
  );

  await writePresenceFile(records);
}
