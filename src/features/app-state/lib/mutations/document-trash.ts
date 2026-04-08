import type { StoredSyntextState } from "@/features/app-state/types";
import {
  getDocumentById,
  isWorkspaceOwnerForDocument,
  nextRestoredTitle,
  now,
} from "@/features/app-state/lib/mutations/shared";

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
