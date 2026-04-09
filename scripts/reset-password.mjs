import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes, scryptSync } from "node:crypto";
import path from "node:path";
import pg from "pg";

const chineseCharacterPattern = /[\u3400-\u9fff]/u;
const HASH_PREFIX = "scrypt";
const HASH_DELIMITER = "$";
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  return [HASH_PREFIX, salt, hash].join(HASH_DELIMITER);
}

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

async function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  let raw;

  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/gu, "");

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = value;
  }
}

await loadEnvFile(".env");
await loadEnvFile(".env.local");

function normalizeLookupValue(value) {
  return value?.trim().toLowerCase() ?? "";
}

function getLookup(input, value) {
  if (!value) {
    return null;
  }

  return { input, value };
}

function findUser(users, lookup) {
  if (lookup.input === "email") {
    return users.find((item) => normalizeLookupValue(item.email) === lookup.value);
  }

  return users.find((item) => normalizeLookupValue(item.username) === lookup.value);
}

const username = normalizeLookupValue(readArg("--username"));
const email = normalizeLookupValue(readArg("--email"));
const password = readArg("--password") ?? "";
const lookups = [
  getLookup("username", username),
  getLookup("email", email),
].filter(Boolean);

if (lookups.length === 0) {
  fail("Missing --email or --username");
}

if (lookups.length > 1) {
  fail("Use either --email or --username, not both");
}

const lookup = lookups[0];

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
    const user = findUser(state.users, lookup);

    if (!user) {
      fail(`${lookup.input === "email" ? "Email" : "Username"} does not exist: ${lookup.value}`);
    }

    user.password = hashPassword(password);

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

  console.log(`Password reset for ${lookup.input}: ${lookup.value}`);
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

const user = findUser(state.users, lookup);

if (!user) {
  fail(`${lookup.input === "email" ? "Email" : "Username"} does not exist: ${lookup.value}`);
}

user.password = hashPassword(password);

await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");

console.log(`Password reset for ${lookup.input}: ${lookup.value}`);
