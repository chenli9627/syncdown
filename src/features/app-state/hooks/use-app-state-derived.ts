"use client";

import { useMemo } from "react";
import {
  getAccessibleWorkspaces,
  getCurrentWorkspace,
  getUserBySession,
  getWorkspaceBuckets,
} from "@/features/app-state/lib/state-utils";
import type { Session, SyntextState } from "@/features/app-state/types";

export function useAppStateDerived(state: SyntextState, session: Session | null) {
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

  return {
    accessibleWorkspaces,
    buckets,
    currentUser,
    currentWorkspace,
  };
}
