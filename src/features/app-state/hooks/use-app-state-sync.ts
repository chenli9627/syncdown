"use client";

import { useEffect } from "react";
import { createSeedState } from "@/features/app-state/lib/seed";
import type { Session, SyntextState } from "@/features/app-state/types";

const SESSION_STORAGE_KEY = "syncdown.session";

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

      try {
        const response = await fetch("/api/app-state", { cache: "no-store" });
        const data = await readJson<{ state: SyntextState }>(response);

        if (disposed) {
          return;
        }

        setState(data.state);
        setSession(savedSession);
      } catch {
        if (disposed) {
          return;
        }

        setState(toFallbackPublicState());
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

    async function syncSilently() {
      try {
        const response = await fetch("/api/app-state", { cache: "no-store" });
        const data = await readJson<{ state: SyntextState }>(response);

        if (!cancelled) {
          setState(data.state);
        }
      } catch {
        // Ignore transient sync failures and keep current local state.
      }
    }

    const intervalId = window.setInterval(() => {
      void syncSilently();
    }, 4000);

    const handleFocus = () => {
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
