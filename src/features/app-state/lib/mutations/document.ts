import type {
  DocumentRecord,
  Permission,
  StoredSyntextState,
} from "@/features/app-state/types";
import {
  canOpenDocument,
  getDocumentAccesses,
  getDocumentById,
  getDocumentPermissionForUser,
  getUserByEmail,
  getUserById,
  getWorkspaceById,
  getWorkspaceOwnerIdForDocument,
  isWorkspaceOwnerForDocument,
  nextRestoredTitle,
  normalizeDocumentTitle,
  now,
  sanitizeEmail,
  titleExistsInWorkspace,
  upsertRecentVisit,
} from "@/features/app-state/lib/mutations/shared";

export function createDocumentForWorkspace(
  state: StoredSyntextState,
  userId: string,
  workspaceId: string,
) {
  const workspace = getWorkspaceById(state, workspaceId);

  if (!workspace || workspace.ownerUserId !== userId) {
    return { ok: false as const, error: "Only the workspace owner can create documents" };
  }

  const createdAt = now();
  const document: DocumentRecord = {
    id: `document_${crypto.randomUUID()}`,
    workspaceId,
    ownerUserId: userId,
    title: "",
    content: "",
    status: "private",
    trashedFromStatus: null,
    deletedAt: null,
    createdAt,
    lastEditedAt: createdAt,
  };

  return {
    ok: true as const,
    documentId: document.id,
    state: {
      ...state,
      documents: [document, ...state.documents],
      recentVisits: upsertRecentVisit(state, userId, document.id, createdAt),
      workspaces: state.workspaces.map((item) =>
        item.id === workspaceId ? { ...item, lastAccessedAt: createdAt } : item,
      ),
    },
  };
}

export function markDocumentVisited(
  state: StoredSyntextState,
  userId: string,
  documentId: string,
) {
  const document = getDocumentById(state, documentId);

  if (!document || !canOpenDocument(state, userId, document)) {
    return { ok: false as const, error: "You do not have access to this document" };
  }

  const visitedAt = now();

  return {
    ok: true as const,
    state: {
      ...state,
      recentVisits: upsertRecentVisit(state, userId, documentId, visitedAt),
      workspaces: state.workspaces.map((workspace) =>
        workspace.id === document.workspaceId
          ? { ...workspace, lastAccessedAt: visitedAt }
          : workspace,
      ),
    },
  };
}

export function updateDocumentForUser(
  state: StoredSyntextState,
  userId: string,
  documentId: string,
  input: {
    title?: string;
    content?: string;
  },
) {
  const document = getDocumentById(state, documentId);

  if (!document || !canOpenDocument(state, userId, document)) {
    return { ok: false as const, error: "You do not have access to this document" };
  }

  const permission = getDocumentPermissionForUser(state, userId, document);

  if (!permission) {
    return { ok: false as const, error: "You do not have access to this document" };
  }

  let nextTitle = document.title;
  let nextContent = document.content;

  if (typeof input.title === "string") {
    if (permission !== "owner") {
      return {
        ok: false as const,
        error: "Only the workspace owner can edit the document title",
      };
    }

    const normalizedTitle = normalizeDocumentTitle(state, document.workspaceId, input.title);

    if (titleExistsInWorkspace(state, document.workspaceId, normalizedTitle, document.id)) {
      return {
        ok: false as const,
        error: "Document title already exists in this workspace",
      };
    }

    nextTitle = normalizedTitle;
  }

  if (typeof input.content === "string") {
    if (permission === "can_view") {
      return {
        ok: false as const,
        error: "You do not have permission to edit this document",
      };
    }

    nextContent = input.content;
  }

  const editedAt = now();

  return {
    ok: true as const,
    state: {
      ...state,
      documents: state.documents.map((item) =>
        item.id === documentId
          ? {
              ...item,
              title: nextTitle,
              content: nextContent,
              lastEditedAt: editedAt,
            }
          : item,
      ),
      recentVisits: upsertRecentVisit(state, userId, documentId, editedAt),
    },
  };
}

export function shareDocumentWithUser(
  state: StoredSyntextState,
  ownerUserId: string,
  documentId: string,
  rawEmail: string,
  permission: Permission,
) {
  const document = getDocumentById(state, documentId);

  if (!document || document.status === "trashed") {
    return { ok: false as const, error: "Document does not exist" };
  }

  if (!isWorkspaceOwnerForDocument(state, ownerUserId, document)) {
    return { ok: false as const, error: "Only the workspace owner can share this document" };
  }

  const email = sanitizeEmail(rawEmail);

  if (!email) {
    return { ok: false as const, error: "Email is required" };
  }

  const targetUser = getUserByEmail(state, email);

  if (!targetUser) {
    return { ok: false as const, error: "This user does not exist" };
  }

  if (targetUser.id === ownerUserId) {
    return { ok: false as const, error: "You cannot share a document with yourself" };
  }

  if (
    state.accesses.some(
      (access) => access.documentId === documentId && access.userId === targetUser.id,
    )
  ) {
    return { ok: false as const, error: "This user already has access" };
  }

  const editedAt = now();

  return {
    ok: true as const,
    state: {
      ...state,
      accesses: [
        ...state.accesses,
        {
          documentId,
          userId: targetUser.id,
          permission,
        },
      ],
      documents: state.documents.map((item) =>
        item.id === documentId
          ? {
              ...item,
              status: "shared" as const,
              lastEditedAt: editedAt,
            }
          : item,
      ),
    },
  };
}

export function updateDocumentAccessForOwner(
  state: StoredSyntextState,
  ownerUserId: string,
  documentId: string,
  targetUserId: string,
  permission: Permission,
) {
  const document = getDocumentById(state, documentId);

  if (!document || document.status === "trashed") {
    return { ok: false as const, error: "Document does not exist" };
  }

  if (!isWorkspaceOwnerForDocument(state, ownerUserId, document)) {
    return { ok: false as const, error: "Only the workspace owner can change permissions" };
  }

  if (getWorkspaceOwnerIdForDocument(state, document) === targetUserId) {
    return { ok: false as const, error: "You cannot change the owner permission" };
  }

  const targetUser = getUserById(state, targetUserId);

  if (!targetUser) {
    return { ok: false as const, error: "This user does not exist" };
  }

  const existingAccess = state.accesses.find(
    (access) => access.documentId === documentId && access.userId === targetUserId,
  );

  if (!existingAccess) {
    return { ok: false as const, error: "This user does not have access" };
  }

  return {
    ok: true as const,
    state: {
      ...state,
      accesses: state.accesses.map((access) =>
        access.documentId === documentId && access.userId === targetUserId
          ? { ...access, permission }
          : access,
      ),
    },
  };
}

export function removeDocumentAccessForOwner(
  state: StoredSyntextState,
  ownerUserId: string,
  documentId: string,
  targetUserId: string,
) {
  const document = getDocumentById(state, documentId);

  if (!document || document.status === "trashed") {
    return { ok: false as const, error: "Document does not exist" };
  }

  if (!isWorkspaceOwnerForDocument(state, ownerUserId, document)) {
    return { ok: false as const, error: "Only the workspace owner can remove access" };
  }

  if (getWorkspaceOwnerIdForDocument(state, document) === targetUserId) {
    return { ok: false as const, error: "You cannot remove the owner" };
  }

  const nextAccesses = state.accesses.filter(
    (access) => !(access.documentId === documentId && access.userId === targetUserId),
  );

  if (nextAccesses.length === state.accesses.length) {
    return { ok: false as const, error: "This user does not have access" };
  }

  const hasRemainingGuests =
    getDocumentAccesses({ ...state, accesses: nextAccesses }, documentId).length > 0;
  const editedAt = now();

  return {
    ok: true as const,
    state: {
      ...state,
      accesses: nextAccesses,
      documents: state.documents.map((item) =>
        item.id === documentId
          ? {
              ...item,
              status: (hasRemainingGuests ? "shared" : "private") as
                | "shared"
                | "private",
              lastEditedAt: hasRemainingGuests ? item.lastEditedAt : editedAt,
            }
          : item,
      ),
      recentVisits: state.recentVisits.filter(
        (visit) => !(visit.userId === targetUserId && visit.documentId === documentId),
      ),
    },
  };
}

export function moveDocumentToTrashForOwner(
  state: StoredSyntextState,
  ownerUserId: string,
  documentId: string,
) {
  const document = getDocumentById(state, documentId);

  if (!document || document.status === "trashed") {
    return { ok: false as const, error: "Document does not exist" };
  }

  if (!isWorkspaceOwnerForDocument(state, ownerUserId, document)) {
    return { ok: false as const, error: "Only the workspace owner can move this document to trash" };
  }

  const editedAt = now();

  return {
    ok: true as const,
    state: {
      ...state,
      documents: state.documents.map((item) =>
        item.id === documentId
          ? {
              ...item,
              status: "trashed" as const,
              trashedFromStatus:
                item.status === "trashed" ? item.trashedFromStatus ?? "private" : item.status,
              deletedAt: editedAt,
              lastEditedAt: editedAt,
            }
          : item,
      ),
      recentVisits: state.recentVisits.filter((visit) => visit.documentId !== documentId),
    },
  };
}

export function restoreDocumentFromTrashForOwner(
  state: StoredSyntextState,
  ownerUserId: string,
  documentId: string,
) {
  const document = getDocumentById(state, documentId);

  if (!document || document.status !== "trashed") {
    return { ok: false as const, error: "Document does not exist" };
  }

  if (!isWorkspaceOwnerForDocument(state, ownerUserId, document)) {
    return {
      ok: false as const,
      error: "Only the workspace owner can restore this document",
    };
  }

  const restoredStatus = document.trashedFromStatus ?? "private";
  const editedAt = now();
  const restoredTitle = nextRestoredTitle(
    state,
    document.workspaceId,
    document.title,
    document.id,
  );

  return {
    ok: true as const,
    state: {
      ...state,
      documents: state.documents.map((item) =>
        item.id === documentId
          ? {
              ...item,
              title: restoredTitle,
              status: restoredStatus,
              trashedFromStatus: null,
              deletedAt: null,
              lastEditedAt: editedAt,
            }
          : item,
      ),
    },
  };
}

export function permanentlyDeleteDocumentFromTrashForOwner(
  state: StoredSyntextState,
  ownerUserId: string,
  documentId: string,
) {
  const document = getDocumentById(state, documentId);

  if (!document || document.status !== "trashed") {
    return { ok: false as const, error: "Document does not exist" };
  }

  if (!isWorkspaceOwnerForDocument(state, ownerUserId, document)) {
    return {
      ok: false as const,
      error: "Only the workspace owner can permanently delete this document",
    };
  }

  return {
    ok: true as const,
    state: {
      ...state,
      documents: state.documents.filter((item) => item.id !== documentId),
      accesses: state.accesses.filter((access) => access.documentId !== documentId),
      recentVisits: state.recentVisits.filter((visit) => visit.documentId !== documentId),
    },
  };
}
