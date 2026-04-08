"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSeedState } from "@/features/app-state/lib/seed";
import {
  canUserOpenDocument,
  getDocumentById,
  getAccessibleWorkspaces,
  getCurrentWorkspace,
  getUserBySession,
  getWorkspaceBuckets,
} from "@/features/app-state/lib/state-utils";
import type {
  DocumentRecord,
  Permission,
  Session,
  SyntextState,
  User,
  Workspace,
} from "@/features/app-state/types";

const SESSION_STORAGE_KEY = "syntext.session";

type RegisterInput = {
  email: string;
  username: string;
  name: string;
  password: string;
};

type Result =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

type AppStateContextValue = {
  ready: boolean;
  state: SyntextState;
  currentUser: User | null;
  currentWorkspace: Workspace | null;
  accessibleWorkspaces: Workspace[];
  buckets: ReturnType<typeof getWorkspaceBuckets> | null;
  login: (username: string, password: string) => Promise<Result>;
  register: (input: RegisterInput) => Promise<Result>;
  logout: () => void;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<Result>;
  renameCurrentWorkspace: (name: string) => Promise<Result>;
  deleteCurrentWorkspace: (confirmName: string) => Promise<Result>;
  createDocument: () => Promise<
    | {
        ok: true;
        documentId: string;
      }
    | {
        ok: false;
        error: string;
      }
  >;
  openDocument: (documentId: string) => Promise<Result>;
  saveDocument: (
    documentId: string,
    input: { title?: string; content?: string },
  ) => Promise<
    | {
        ok: true;
        document: DocumentRecord | null;
      }
    | {
        ok: false;
        error: string;
      }
  >;
  getDocument: (documentId: string) => DocumentRecord | null;
  shareDocument: (
    documentId: string,
    input: { email: string; permission: Permission },
  ) => Promise<Result>;
  updateDocumentAccess: (
    documentId: string,
    targetUserId: string,
    permission: Permission,
  ) => Promise<Result>;
  removeDocumentAccess: (documentId: string, targetUserId: string) => Promise<Result>;
  moveDocumentToTrash: (documentId: string) => Promise<Result>;
  restoreDocumentFromTrash: (documentId: string) => Promise<Result>;
  permanentlyDeleteDocument: (documentId: string) => Promise<Result>;
};

const emptyState: SyntextState = {
  users: [],
  workspaces: [],
  documents: [],
  accesses: [],
  recentVisits: [],
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

type AppStateProviderProps = {
  children: ReactNode;
};

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

async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

export function AppStateProvider({ children }: AppStateProviderProps) {
  const [state, setState] = useState<SyntextState>(emptyState);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

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
  }, []);

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
  }, [ready, session]);

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

  const currentUser = getUserBySession(state, session);
  const accessibleWorkspaces = useMemo(
    () => (currentUser ? getAccessibleWorkspaces(state, currentUser) : []),
    [currentUser, state],
  );
  const currentWorkspace =
    currentUser && session ? getCurrentWorkspace(state, currentUser, session) : null;
  const buckets =
    currentUser && currentWorkspace
      ? getWorkspaceBuckets(state, currentWorkspace.id, currentUser)
      : null;

  useEffect(() => {
    if (!ready || !session || !currentUser || accessibleWorkspaces.length === 0) {
      return;
    }

    const hasCurrentWorkspace = accessibleWorkspaces.some(
      (workspace) => workspace.id === session.currentWorkspaceId,
    );

    if (hasCurrentWorkspace) {
      return;
    }

    setSession({
      userId: currentUser.id,
      currentWorkspaceId: accessibleWorkspaces[0].id,
    });
  }, [accessibleWorkspaces, currentUser, ready, session]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      ready,
      state,
      currentUser,
      currentWorkspace,
      accessibleWorkspaces,
      buckets,
      login: async (username, password) => {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await readJson<
          | { error: string }
          | { session: Session; state: SyntextState }
        >(response);

        if (!response.ok || !("session" in data)) {
          return {
            ok: false,
            error: "error" in data ? data.error : "Login failed",
          };
        }

        setState(data.state);
        setSession(data.session);

        return { ok: true };
      },
      register: async (input) => {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false,
            error: data.error ?? "Registration failed",
          };
        }

        setState(data.state);

        return { ok: true };
      },
      logout: () => {
        setSession(null);
      },
      switchWorkspace: (workspaceId) => {
        if (!currentUser) {
          return;
        }

        setSession({
          userId: currentUser.id,
          currentWorkspaceId: workspaceId,
        });

        setState((current) => ({
          ...current,
          workspaces: current.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? { ...workspace, lastAccessedAt: new Date().toISOString() }
              : workspace,
          ),
        }));
      },
      createWorkspace: async (name) => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }

        const response = await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id, name }),
        });
        const data = await readJson<{
          error?: string;
          state?: SyntextState;
          workspaceId?: string;
        }>(response);

        if (!response.ok || !data.state || !data.workspaceId) {
          return {
            ok: false,
            error: data.error ?? "Workspace creation failed",
          };
        }

        setState(data.state);
        setSession({
          userId: currentUser.id,
          currentWorkspaceId: data.workspaceId,
        });

        return { ok: true };
      },
      renameCurrentWorkspace: async (name) => {
        if (!currentUser || !currentWorkspace) {
          return { ok: false, error: "You must be inside a workspace" };
        }

        const response = await fetch(`/api/workspaces/${currentWorkspace.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id, name }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false,
            error: data.error ?? "Workspace rename failed",
          };
        }

        setState(data.state);

        return { ok: true };
      },
      deleteCurrentWorkspace: async (confirmName) => {
        if (!currentUser || !currentWorkspace) {
          return { ok: false, error: "You must be inside a workspace" };
        }

        const response = await fetch(`/api/workspaces/${currentWorkspace.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            confirmName,
          }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false,
            error: data.error ?? "Workspace delete failed",
          };
        }

        setState(data.state);

        const nextUser = data.state.users.find((user) => user.id === currentUser.id) ?? null;
        const nextWorkspaces = nextUser ? getAccessibleWorkspaces(data.state, nextUser) : [];
        const nextWorkspace = nextWorkspaces[0] ?? null;

        setSession(
          nextWorkspace
            ? {
                userId: currentUser.id,
                currentWorkspaceId: nextWorkspace.id,
              }
            : null,
        );

        return { ok: true };
      },
      createDocument: async () => {
        if (!currentUser || !currentWorkspace) {
          return { ok: false, error: "You must be inside a workspace" };
        }

        const response = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            workspaceId: currentWorkspace.id,
          }),
        });
        const data = await readJson<{
          error?: string;
          state?: SyntextState;
          documentId?: string;
        }>(response);

        if (!response.ok || !data.state || !data.documentId) {
          return {
            ok: false,
            error: data.error ?? "Document creation failed",
          };
        }

        setState(data.state);

        return { ok: true, documentId: data.documentId };
      },
      openDocument: async (documentId) => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }

        const response = await fetch(`/api/documents/${documentId}/visit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false,
            error: data.error ?? "Document open failed",
          };
        }

        setState(data.state);

        const document = getDocumentById(data.state, documentId);

        if (document) {
          setSession({
            userId: currentUser.id,
            currentWorkspaceId: document.workspaceId,
          });
        }

        return { ok: true };
      },
      saveDocument: async (documentId, input) => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }

        const response = await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            title: input.title,
            content: input.content,
          }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false,
            error: data.error ?? "Document save failed",
          };
        }

        setState(data.state);

        return {
          ok: true,
          document: getDocumentById(data.state, documentId),
        };
      },
      getDocument: (documentId) => {
        if (!currentUser || !canUserOpenDocument(state, currentUser, documentId)) {
          return null;
        }

        return getDocumentById(state, documentId);
      },
      shareDocument: async (documentId, input) => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }

        const response = await fetch(`/api/documents/${documentId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            email: input.email,
            permission: input.permission,
          }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false,
            error: data.error ?? "Document share failed",
          };
        }

        setState(data.state);

        return { ok: true };
      },
      updateDocumentAccess: async (documentId, targetUserId, permission) => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }

        const response = await fetch(`/api/documents/${documentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            targetUserId,
            permission,
          }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false,
            error: data.error ?? "Permission update failed",
          };
        }

        setState(data.state);

        return { ok: true };
      },
      removeDocumentAccess: async (documentId, targetUserId) => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }

        const response = await fetch(`/api/documents/${documentId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            targetUserId,
          }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false,
            error: data.error ?? "Access removal failed",
          };
        }

        setState(data.state);

        return { ok: true };
      },
      moveDocumentToTrash: async (documentId) => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }

        const response = await fetch(`/api/documents/${documentId}/trash`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
          }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false,
            error: data.error ?? "Move to trash failed",
          };
        }

        setState(data.state);

        return { ok: true };
      },
      restoreDocumentFromTrash: async (documentId) => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }

        const response = await fetch(`/api/documents/${documentId}/trash`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
          }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false,
            error: data.error ?? "Restore failed",
          };
        }

        setState(data.state);

        return { ok: true };
      },
      permanentlyDeleteDocument: async (documentId) => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }

        const response = await fetch(`/api/documents/${documentId}/trash`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
          }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false,
            error: data.error ?? "Delete failed",
          };
        }

        setState(data.state);

        return { ok: true };
      },
    }),
    [accessibleWorkspaces, buckets, currentUser, currentWorkspace, ready, state],
  );

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }

  return context;
}
