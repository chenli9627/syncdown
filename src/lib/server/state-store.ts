import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSeedState } from "@/features/app-state/lib/seed";
import { migrateStoredStatePasswords } from "@/features/app-state/lib/password";
import type {
  StoredSyntextState,
  SyntextState,
  User,
} from "@/features/app-state/types";
import {
  readStoredStateFromPostgres,
  writeStoredStateToPostgres,
} from "@/lib/server/postgres-state-store";

const DATA_DIR = path.join(process.cwd(), ".data");
const STATE_FILE = path.join(DATA_DIR, "app-state.json");

function sanitizeUsers(users: StoredSyntextState["users"]): User[] {
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  }));
}

export function toPublicState(state: StoredSyntextState): SyntextState {
  return {
    users: sanitizeUsers(state.users),
    workspaces: state.workspaces,
    documents: state.documents,
    accesses: state.accesses,
    recentVisits: state.recentVisits,
  };
}

async function ensureStateFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(STATE_FILE, "utf8");
  } catch {
    await writeFile(STATE_FILE, JSON.stringify(createSeedState(), null, 2), "utf8");
  }
}

async function persistMigratedState(state: StoredSyntextState) {
  if (process.env.DATABASE_URL?.trim()) {
    await writeStoredStateToPostgres(state);
    return;
  }

  await ensureStateFile();
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

async function readAndMigrateState(readState: () => Promise<StoredSyntextState>) {
  const state = await readState();
  const migrated = migrateStoredStatePasswords(state);

  if (migrated.changed) {
    await persistMigratedState(migrated.state);
  }

  return migrated.state;
}

export async function readStoredState() {
  if (process.env.DATABASE_URL?.trim()) {
    return readAndMigrateState(readStoredStateFromPostgres);
  }

  await ensureStateFile();

  const raw = await readFile(STATE_FILE, "utf8");

  try {
    return readAndMigrateState(async () => JSON.parse(raw) as StoredSyntextState);
  } catch {
    const seedState = createSeedState();
    await writeFile(STATE_FILE, JSON.stringify(seedState, null, 2), "utf8");
    return seedState;
  }
}

export async function writeStoredState(state: StoredSyntextState) {
  if (process.env.DATABASE_URL?.trim()) {
    await writeStoredStateToPostgres(state);
    return;
  }

  await ensureStateFile();
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

export function getStateFilePath() {
  return STATE_FILE;
}
