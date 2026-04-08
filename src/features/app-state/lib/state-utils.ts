import type {
  DocumentRecord,
  Session,
  SyntextState,
  User,
  Workspace,
} from "@/features/app-state/types";

export function getUserBySession(state: SyntextState, session: Session | null) {
  if (!session) {
    return null;
  }

  return state.users.find((user) => user.id === session.userId) ?? null;
}

export function getWorkspaceById(
  state: SyntextState,
  workspaceId: string | null | undefined,
) {
  if (!workspaceId) {
    return null;
  }

  return state.workspaces.find((workspace) => workspace.id === workspaceId) ?? null;
}

export function getDocumentById(
  state: SyntextState,
  documentId: string | null | undefined,
) {
  if (!documentId) {
    return null;
  }

  return state.documents.find((document) => document.id === documentId) ?? null;
}

export function canUserOpenDocument(state: SyntextState, user: User, documentId: string) {
  const document = getDocumentById(state, documentId);

  if (!document || document.status === "trashed") {
    return false;
  }

  if (document.ownerUserId === user.id) {
    return true;
  }

  return state.accesses.some(
    (access) => access.documentId === documentId && access.userId === user.id,
  );
}

export function getAccessibleWorkspaceIds(state: SyntextState, user: User) {
  const ownedWorkspaceIds = state.workspaces
    .filter((workspace) => workspace.ownerUserId === user.id)
    .map((workspace) => workspace.id);

  const sharedWorkspaceIds = state.accesses
    .filter((access) => access.userId === user.id)
    .map((access) => {
      const document = state.documents.find((item) => item.id === access.documentId);
      return document?.workspaceId ?? null;
    })
    .filter((workspaceId): workspaceId is string => Boolean(workspaceId));

  return [...new Set([...ownedWorkspaceIds, ...sharedWorkspaceIds])];
}

export function getAccessibleWorkspaces(state: SyntextState, user: User) {
  const accessibleWorkspaceIds = new Set(getAccessibleWorkspaceIds(state, user));

  return state.workspaces
    .filter((workspace) => accessibleWorkspaceIds.has(workspace.id))
    .sort((left, right) => {
      return (
        new Date(right.lastAccessedAt).getTime() -
        new Date(left.lastAccessedAt).getTime()
      );
    });
}

export function getCurrentWorkspace(state: SyntextState, user: User, session: Session) {
  const accessibleWorkspaces = getAccessibleWorkspaces(state, user);

  return (
    accessibleWorkspaces.find((workspace) => workspace.id === session.currentWorkspaceId) ??
    accessibleWorkspaces[0] ??
    null
  );
}

export function isWorkspaceOwner(workspace: Workspace, user: User) {
  return workspace.ownerUserId === user.id;
}

export function getDocumentsForWorkspace(
  state: SyntextState,
  workspaceId: string,
  user: User,
) {
  return state.documents.filter((document) => {
    if (document.workspaceId !== workspaceId) {
      return false;
    }

    if (document.status === "trashed") {
      return false;
    }

    if (document.ownerUserId === user.id) {
      return true;
    }

    return state.accesses.some(
      (access) => access.documentId === document.id && access.userId === user.id,
    );
  });
}

export function getWorkspaceBuckets(
  state: SyntextState,
  workspaceId: string,
  user: User,
) {
  const documents = getDocumentsForWorkspace(state, workspaceId, user);

  const recents = state.recentVisits
    .filter((visit) => visit.userId === user.id)
    .sort(
      (left, right) =>
        new Date(right.visitedAt).getTime() - new Date(left.visitedAt).getTime(),
    )
    .map((visit) => documents.find((document) => document.id === visit.documentId))
    .filter((document): document is DocumentRecord => Boolean(document));

  const shared = documents
    .filter((document) => document.status === "shared")
    .sort(byLastEditedDesc);
  const privateDocs = documents
    .filter((document) => document.status === "private" && document.ownerUserId === user.id)
    .sort(byLastEditedDesc);
  const trash = state.documents
    .filter(
      (document) =>
        document.workspaceId === workspaceId &&
        document.status === "trashed" &&
        document.ownerUserId === user.id,
    )
    .sort(byLastEditedDesc);

  return { recents, shared, privateDocs, trash };
}

function byLastEditedDesc(left: DocumentRecord, right: DocumentRecord) {
  return new Date(right.lastEditedAt).getTime() - new Date(left.lastEditedAt).getTime();
}
