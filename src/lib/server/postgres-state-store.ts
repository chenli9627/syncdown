import { Pool } from "pg";
import { createSeedState } from "@/features/app-state/lib/seed";
import type { StoredSyntextState } from "@/features/app-state/types";

const TABLE_NAME = "syncdown_state";

let pool: Pool | null = null;

function getPool() {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool({ connectionString });
  }

  return pool;
}

async function ensureTable() {
  const client = await getPool().connect();

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

export async function readStoredStateFromPostgres() {
  await ensureTable();
  const client = await getPool().connect();

  try {
    const result = await client.query<{ snapshot: StoredSyntextState }>(
      `select snapshot from ${TABLE_NAME} where id = $1 limit 1`,
      ["default"],
    );

    if (result.rows[0]?.snapshot) {
      return result.rows[0].snapshot;
    }

    const seed = createSeedState();
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
  const client = await getPool().connect();

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
