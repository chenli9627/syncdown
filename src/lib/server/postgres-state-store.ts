import { readFile } from "node:fs/promises";
import path from "node:path";
import { createSeedState } from "@/features/app-state/lib/seed";
import type { StoredSyntextState } from "@/features/app-state/types";
import { getPostgresPool } from "@/lib/server/postgres-client";

const TABLE_NAME = "syncdown_state";
const LOCAL_STATE_FILE = path.join(process.cwd(), ".data", "app-state.json");

async function ensureTable() {
  const client = await getPostgresPool().connect();

  try {
    await client.query(`
      create table if not exists ${TABLE_NAME} (
        id text primary key,
        snapshot jsonb not null,
        updated_at timestamptz not null default now()
      )
    `);
  } finally {
    client.release();
  }
}

async function readLocalSnapshotFallback() {
  try {
    const raw = await readFile(LOCAL_STATE_FILE, "utf8");
    return JSON.parse(raw) as StoredSyntextState;
  } catch {
    return createSeedState();
  }
}

export async function readStoredStateFromPostgres() {
  await ensureTable();
  const client = await getPostgresPool().connect();

  try {
    const result = await client.query<{ snapshot: StoredSyntextState }>(
      `select snapshot from ${TABLE_NAME} where id = $1 limit 1`,
      ["default"],
    );

    if (result.rows[0]?.snapshot) {
      return result.rows[0].snapshot;
    }

    const seed = await readLocalSnapshotFallback();
    await client.query(
      `insert into ${TABLE_NAME} (id, snapshot) values ($1, $2::jsonb)
       on conflict (id) do update set snapshot = excluded.snapshot, updated_at = now()`,
      ["default", JSON.stringify(seed)],
    );

    return seed;
  } finally {
    client.release();
  }
}

export async function writeStoredStateToPostgres(state: StoredSyntextState) {
  await ensureTable();
  const client = await getPostgresPool().connect();

  try {
    await client.query(
      `insert into ${TABLE_NAME} (id, snapshot) values ($1, $2::jsonb)
       on conflict (id) do update set snapshot = excluded.snapshot, updated_at = now()`,
      ["default", JSON.stringify(state)],
    );
  } finally {
    client.release();
  }
}
