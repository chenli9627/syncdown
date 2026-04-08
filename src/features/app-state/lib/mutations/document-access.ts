import type { Permission, StoredSyntextState } from "@/features/app-state/types";
import {
  getDocumentAccesses,
  getDocumentById,
  getUserByEmail,
  getUserById,
  getWorkspaceOwnerIdForDocument,
  isWorkspaceOwnerForDocument,
  now,
  sanitizeEmail,
} from "@/features/app-state/lib/mutations/shared";

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
