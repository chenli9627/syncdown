"use client";

import {
  createContext,
  useContext,
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
  getWorkspaceBuckets,
} from "@/features/app-state/lib/state-utils";
import type { Session, SyntextState, User, Workspace } from "@/features/app-state/types";
import { useAppStateDerived } from "@/features/app-state/hooks/use-app-state-derived";
import { useAppStateSessionGuard } from "@/features/app-state/hooks/use-app-state-session-guard";

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

  const { accessibleWorkspaces, buckets, currentUser, currentWorkspace } =
    useAppStateDerived(state, session);
  const actions = useAppStateActions({
    currentUser,
    currentWorkspace,
    setSession,
    setState,
    state,
  });

  useAppStateSessionGuard({
    accessibleWorkspaces,
    currentUser,
    ready,
    session,
    setSession,
  });

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
