import type {
  DocumentRecord,
  StoredSyntextState,
} from "@/features/app-state/types";
import {
  canOpenDocument,
  getDocumentById,
  getDocumentPermissionForUser,
  getWorkspaceById,
  normalizeDocumentTitle,
  now,
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
