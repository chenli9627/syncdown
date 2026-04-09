import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { StoredSyntextState } from "@/features/app-state/types";

const HASH_PREFIX = "scrypt";
const HASH_DELIMITER = "$";
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  return [HASH_PREFIX, salt, hash].join(HASH_DELIMITER);
}

export function isPasswordHash(value: string) {
  const [prefix, salt, hash, ...rest] = value.split(HASH_DELIMITER);

  return (
    prefix === HASH_PREFIX &&
    Boolean(salt) &&
    Boolean(hash) &&
    rest.length === 0
  );
}

export function verifyPassword(storedPassword: string, password: string) {
  if (!isPasswordHash(storedPassword)) {
    return {
      matches: storedPassword === password,
      needsRehash: storedPassword === password,
    };
  }

  const [, salt, storedHash] = storedPassword.split(HASH_DELIMITER);
  const actualHash = scryptSync(password, salt, KEY_LENGTH);
  const expectedHash = Buffer.from(storedHash, "hex");

  if (actualHash.length !== expectedHash.length) {
    return { matches: false, needsRehash: false };
  }

  return {
    matches: timingSafeEqual(actualHash, expectedHash),
    needsRehash: false,
  };
}

export function migrateStoredStatePasswords(state: StoredSyntextState) {
  let changed = false;

  const users = state.users.map((user) => {
    if (isPasswordHash(user.password)) {
      return user;
    }

    changed = true;

    return {
      ...user,
      password: hashPassword(user.password),
    };
  });

  return {
    changed,
    state: changed ? { ...state, users } : state,
  };
}
