"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type AppStateActions,
  useAppStateActions,
} from "@/features/app-state/hooks/use-app-state-actions";
import { useAppStateSync } from "@/features/app-state/hooks/use-app-state-sync";
import {
  getAccessibleWorkspaces,
  getCurrentWorkspace,
  getUserBySession,
  getWorkspaceBuckets,
} from "@/features/app-state/lib/state-utils";
import type { Session, SyntextState, User, Workspace } from "@/features/app-state/types";

type AppStateContextValue = {
  ready: boolean;
  state: SyntextState;
  currentUser: User | null;
  currentWorkspace: Workspace | null;
  accessibleWorkspaces: Workspace[];
  buckets: ReturnType<typeof getWorkspaceBuckets> | null;
} & AppStateActions;

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

export function AppStateProvider({ children }: AppStateProviderProps) {
  const [state, setState] = useState<SyntextState>(emptyState);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useAppStateSync({
    ready,
    session,
    setReady,
    setSession,
    setState,
  });

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
  const actions = useAppStateActions({
    currentUser,
    currentWorkspace,
    setSession,
    setState,
    state,
  });

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

    const timeoutId = window.setTimeout(() => {
      setSession({
        userId: currentUser.id,
        currentWorkspaceId: accessibleWorkspaces[0].id,
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [accessibleWorkspaces, currentUser, ready, session]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      ready,
      state,
      currentUser,
      currentWorkspace,
      accessibleWorkspaces,
      buckets,
      ...actions,
    }),
    [actions, accessibleWorkspaces, buckets, currentUser, currentWorkspace, ready, state],
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
