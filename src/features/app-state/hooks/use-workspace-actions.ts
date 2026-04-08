"use client";

import { useMemo } from "react";
import { getAccessibleWorkspaces } from "@/features/app-state/lib/state-utils";
import type { Session, SyntextState, User, Workspace } from "@/features/app-state/types";
import { type Result } from "@/features/app-state/hooks/app-state-actions-shared";
import { readJson } from "@/features/app-state/hooks/use-app-state-sync";

type UseWorkspaceActionsArgs = {
  currentUser: User | null;
  currentWorkspace: Workspace | null;
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
  setState: React.Dispatch<React.SetStateAction<SyntextState>>;
};

export function useWorkspaceActions({
  currentUser,
  currentWorkspace,
  setSession,
  setState,
}: UseWorkspaceActionsArgs) {
  return useMemo(
    () => ({
      switchWorkspace: (workspaceId: string) => {
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
      createWorkspace: async (name: string): Promise<Result> => {
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
          return { ok: false, error: "Workspace creation failed" };
        }

        setState(data.state);
        setSession({
          userId: currentUser.id,
          currentWorkspaceId: data.workspaceId,
        });

        return { ok: true };
      },
      renameCurrentWorkspace: async (name: string): Promise<Result> => {
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
          return { ok: false, error: data.error ?? "Workspace rename failed" };
        }

        setState(data.state);
        return { ok: true };
      },
      deleteCurrentWorkspace: async (confirmName: string): Promise<Result> => {
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
          return { ok: false, error: data.error ?? "Workspace delete failed" };
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
    }),
    [currentUser, currentWorkspace, setSession, setState],
  );
}
