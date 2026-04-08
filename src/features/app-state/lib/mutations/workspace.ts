import type { StoredSyntextState } from "@/features/app-state/types";
import {
  getWorkspaceById,
  makeWorkspace,
  sanitizeWorkspaceName,
} from "@/features/app-state/lib/mutations/shared";

export { sanitizeWorkspaceName } from "@/features/app-state/lib/mutations/shared";

export function createWorkspaceForUser(
  state: StoredSyntextState,
  userId: string,
  rawName: string,
) {
  const name = sanitizeWorkspaceName(rawName);

  if (!name) {
    return { ok: false as const, error: "Workspace name is required" };
  }

  const exists = state.workspaces.some(
    (workspace) => workspace.ownerUserId === userId && workspace.name === name,
  );

  if (exists) {
    return { ok: false as const, error: "Workspace name already exists" };
  }

  const workspace = makeWorkspace(userId, name);

  return {
    ok: true as const,
    workspace,
    state: {
      ...state,
      workspaces: [...state.workspaces, workspace],
    },
  };
}

export function renameWorkspaceForUser(
  state: StoredSyntextState,
  userId: string,
  workspaceId: string,
  rawName: string,
) {
  const name = sanitizeWorkspaceName(rawName);

  if (!name) {
    return { ok: false as const, error: "Workspace name is required" };
  }

  const targetWorkspace = getWorkspaceById(state, workspaceId);

  if (!targetWorkspace || targetWorkspace.ownerUserId !== userId) {
    return { ok: false as const, error: "You cannot manage this workspace" };
  }

  const duplicate = state.workspaces.some(
    (workspace) =>
      workspace.id !== workspaceId &&
      workspace.ownerUserId === userId &&
      workspace.name === name,
  );

  if (duplicate) {
    return { ok: false as const, error: "Workspace name already exists" };
  }

  return {
    ok: true as const,
    state: {
      ...state,
      workspaces: state.workspaces.map((workspace) =>
        workspace.id === workspaceId ? { ...workspace, name } : workspace,
      ),
    },
  };
}

export function deleteWorkspaceForUser(
  state: StoredSyntextState,
  userId: string,
  workspaceId: string,
  confirmName: string,
) {
  const targetWorkspace = getWorkspaceById(state, workspaceId);

  if (!targetWorkspace || targetWorkspace.ownerUserId !== userId) {
    return { ok: false as const, error: "You cannot manage this workspace" };
  }

  if (sanitizeWorkspaceName(confirmName) !== targetWorkspace.name) {
    return { ok: false as const, error: "Workspace name does not match" };
  }

  const removedDocumentIds = new Set(
    state.documents
      .filter((document) => document.workspaceId === workspaceId)
      .map((document) => document.id),
  );

  const nextState: StoredSyntextState = {
    users: state.users,
    workspaces: state.workspaces.filter((workspace) => workspace.id !== workspaceId),
    documents: state.documents.filter((document) => document.workspaceId !== workspaceId),
    accesses: state.accesses.filter((access) => !removedDocumentIds.has(access.documentId)),
    recentVisits: state.recentVisits.filter(
      (visit) => !removedDocumentIds.has(visit.documentId),
    ),
  };

  const remainingOwnedWorkspaceCount = nextState.workspaces.filter(
    (workspace) => workspace.ownerUserId === userId,
  ).length;

  if (remainingOwnedWorkspaceCount === 0) {
    nextState.workspaces = [...nextState.workspaces, makeWorkspace(userId, "Default")];
  }

  return { ok: true as const, state: nextState };
}
