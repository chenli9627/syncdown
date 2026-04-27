import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const STATE_ID = "default";
const STATE_FILE = path.join(process.cwd(), ".data", "app-state.json");
const ENV_FILE = path.join(process.cwd(), ".env.local");

async function loadEnvFile(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing env files so explicit process env still works.
  }
}

async function main() {
  await loadEnvFile(ENV_FILE);
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const raw = await readFile(STATE_FILE, "utf8");
  const state = JSON.parse(raw);
  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    await pool.query(`
      create table if not exists syncdown_state (
        id text primary key,
        snapshot jsonb not null,
        updated_at timestamptz not null default now()
      )
    `);

    await pool.query(
      `insert into syncdown_state (id, snapshot)
       values ($1, $2::jsonb)
       on conflict (id)
       do update set snapshot = excluded.snapshot, updated_at = now()`,
      [STATE_ID, JSON.stringify(state)],
    );
  } finally {
    await pool.end();
  }

  console.log(
    `[syncdown] reset dev state from ${path.relative(process.cwd(), STATE_FILE)} into PostgreSQL row "${STATE_ID}"`,
  );
}

main().catch((error) => {
  console.error(
    `[syncdown] failed to reset dev state: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
