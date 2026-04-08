"use client";

import { useEffect } from "react";
import type { Session, User, Workspace } from "@/features/app-state/types";

type UseAppStateSessionGuardArgs = {
  accessibleWorkspaces: Workspace[];
  currentUser: User | null;
  ready: boolean;
  session: Session | null;
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
};

export function useAppStateSessionGuard({
  accessibleWorkspaces,
  currentUser,
  ready,
  session,
  setSession,
}: UseAppStateSessionGuardArgs) {
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
    return () => window.clearTimeout(timeoutId);
  }, [accessibleWorkspaces, currentUser, ready, session, setSession]);
}
