import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const chineseCharacterPattern = /[\u3400-\u9fff]/u;

function readArg(flag) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const username = readArg("--username")?.trim().toLowerCase() ?? "";
const password = readArg("--password") ?? "";

if (!username) {
  fail("Missing --username");
}

if (!password) {
  fail("Missing --password");
}

if (password.length < 8) {
  fail("Password must be at least 8 characters");
}

if (chineseCharacterPattern.test(password)) {
  fail("Password cannot contain Chinese characters");
}

const databaseUrl = process.env.DATABASE_URL?.trim();

if (databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query(`
      create table if not exists syncdown_state (
        id text primary key,
        snapshot jsonb not null,
        updated_at timestamptz not null default now()
      )
    `);

    const result = await client.query(
      "select snapshot from syncdown_state where id = $1 limit 1",
      ["default"],
    );

    if (!result.rows[0]?.snapshot) {
      fail("PostgreSQL state snapshot does not exist yet");
    }

    const state = result.rows[0].snapshot;
    const user = state.users.find((item) => item.username === username);

    if (!user) {
      fail(`Username does not exist: ${username}`);
    }

    user.password = password;

    await client.query(
      `update syncdown_state
       set snapshot = $2::jsonb, updated_at = now()
       where id = $1`,
      ["default", JSON.stringify(state)],
    );
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`Password reset for ${username}`);
  process.exit(0);
}

const dataDir = path.join(process.cwd(), ".data");
const statePath = path.join(dataDir, "app-state.json");

await mkdir(dataDir, { recursive: true });

let state;

try {
  state = JSON.parse(await readFile(statePath, "utf8"));
} catch {
  fail(`State file does not exist yet: ${statePath}`);
}

const user = state.users.find((item) => item.username === username);

if (!user) {
  fail(`Username does not exist: ${username}`);
}

user.password = password;

await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");

console.log(`Password reset for ${username}`);
