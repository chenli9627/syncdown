"use client";

import { useEffect } from "react";
import { createSeedState } from "@/features/app-state/lib/seed";
import type { Session, SyntextState } from "@/features/app-state/types";
import {
  resolveBootstrapState,
  shouldApplySyncedState,
} from "@/features/app-state/hooks/app-state-sync-shared";

const SESSION_STORAGE_KEY = "syncdown.session";
const STATE_STORAGE_KEY = "syncdown.state";
const APP_STATE_SYNC_INTERVAL_MS = 30_000;
const MIN_SILENT_SYNC_GAP_MS = 5_000;

function toFallbackPublicState(): SyntextState {
  const seed = createSeedState();

  return {
    users: seed.users.map((user) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    })),
    workspaces: seed.workspaces,
    documents: seed.documents,
    accesses: seed.accesses,
    recentVisits: seed.recentVisits,
  };
}

function loadSavedSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function loadSavedState() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STATE_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SyntextState;
  } catch {
    return null;
  }
}

function persistStateSnapshot(state: SyntextState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    window.localStorage.removeItem(STATE_STORAGE_KEY);
  }
}

export async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

type UseAppStateSyncArgs = {
  ready: boolean;
  session: Session | null;
  setReady: (value: boolean) => void;
  setSession: (value: Session | null) => void;
  setState: React.Dispatch<React.SetStateAction<SyntextState>>;
};

export function useAppStateSync({
  ready,
  session,
  setReady,
  setSession,
  setState,
}: UseAppStateSyncArgs) {
  useEffect(() => {
    let disposed = false;

    async function bootstrap() {
      const savedSession = loadSavedSession();
      const savedState = loadSavedState();

      try {
        const response = await fetch("/api/app-state", { cache: "no-store" });
        const data = await readJson<{ state: SyntextState }>(response);

        if (disposed) {
          return;
        }

        const nextState = resolveBootstrapState({
          savedSession,
          savedState,
          serverState: data.state,
        });

        setState(nextState);
        setSession(savedSession);
        persistStateSnapshot(nextState);
      } catch {
        if (disposed) {
          return;
        }

        setState(savedState ?? toFallbackPublicState());
        setSession(savedSession);
      } finally {
        if (!disposed) {
          setReady(true);
        }
      }
    }

    void bootstrap();

    return () => {
      disposed = true;
    };
  }, [setReady, setSession, setState]);

  useEffect(() => {
    if (!ready || !session) {
      return;
    }

    let cancelled = false;
    let syncInFlight = false;
    let lastSyncStartedAt = 0;

    async function syncSilently() {
      if (syncInFlight) {
        return;
      }

      if (document.visibilityState === "hidden") {
        return;
      }

      const now = Date.now();

      if (now - lastSyncStartedAt < MIN_SILENT_SYNC_GAP_MS) {
        return;
      }

      lastSyncStartedAt = now;
      syncInFlight = true;

      try {
        const response = await fetch("/api/app-state", { cache: "no-store" });
        const data = await readJson<{ state: SyntextState }>(response);

        if (cancelled) {
          return;
        }

        if (!shouldApplySyncedState({ nextState: data.state, session })) {
          return;
        }

        setState(data.state);
        persistStateSnapshot(data.state);
      } catch {
        // Ignore transient sync failures and keep current local state.
      } finally {
        syncInFlight = false;
      }
    }

    const intervalId = window.setInterval(() => {
      void syncSilently();
    }, APP_STATE_SYNC_INTERVAL_MS);

    const handleFocus = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      void syncSilently();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [ready, session, setState]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!session) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }, [ready, session]);
}
