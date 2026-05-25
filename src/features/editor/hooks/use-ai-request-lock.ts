"use client";

import { useMemo, useSyncExternalStore } from "react";

type AiRequestOwner = "chat" | "selection";

type AiRequestLockSnapshot = {
  owner: AiRequestOwner | null;
};

let snapshot: AiRequestLockSnapshot = { owner: null };
const listeners = new Set<() => void>();

export function useAiRequestLock(owner: AiRequestOwner) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return useMemo(
    () => ({
      acquire: () => acquireAiRequestLock(owner),
      isLocked: state.owner !== null,
      isLockedByOther: state.owner !== null && state.owner !== owner,
      owner: state.owner,
      release: () => releaseAiRequestLock(owner),
    }),
    [owner, state.owner],
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function acquireAiRequestLock(owner: AiRequestOwner) {
  if (snapshot.owner && snapshot.owner !== owner) {
    return false;
  }

  if (snapshot.owner === owner) {
    return true;
  }

  snapshot = { owner };
  emitChange();
  return true;
}

function releaseAiRequestLock(owner: AiRequestOwner) {
  if (snapshot.owner !== owner) {
    return;
  }

  snapshot = { owner: null };
  emitChange();
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}
