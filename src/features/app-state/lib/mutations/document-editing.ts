import type {
  DocumentVersion,
  DocumentRecord,
  StoredSyntextState,
} from "@/features/app-state/types";
import {
  canOpenDocument,
  getDocumentById,
  getDocumentPermissionForUser,
  getWorkspaceById,
  nextUntitledTitle,
  normalizeDocumentTitle,
  now,
  titleExistsInWorkspace,
  upsertRecentVisit,
} from "@/features/app-state/lib/mutations/shared";

const VERSION_HISTORY_MERGE_WINDOW_MS = 10 * 60 * 1000;
const MAX_DOCUMENT_VERSION_HISTORY = 50;

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
    title: nextUntitledTitle(state, workspaceId),
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
  const contentChanged =
    typeof input.content === "string" &&
    hasVersionWorthyContentChange(document.content, input.content);
  const versionHistory = contentChanged
    ? updateVersionHistory(document, userId, editedAt)
    : document.versionHistory;

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
              versionHistory,
            }
          : item,
      ),
      recentVisits: upsertRecentVisit(state, userId, documentId, editedAt),
    },
  };
}

function updateVersionHistory(
  document: DocumentRecord,
  userId: string,
  editedAt: string,
): DocumentVersion[] {
  const snapshot: DocumentVersion = {
    id: `version_${crypto.randomUUID()}`,
    title: document.title,
    content: document.content,
    createdAt: editedAt,
    userId,
  };
  const currentHistory = document.versionHistory ?? [];
  const latest = currentHistory[0] ?? null;

  if (latest?.content === snapshot.content && latest.title === snapshot.title) {
    return currentHistory;
  }

  if (latest && isRecentVersion(latest.createdAt, editedAt)) {
    return [snapshot, ...currentHistory.slice(1)].slice(0, MAX_DOCUMENT_VERSION_HISTORY);
  }

  return [snapshot, ...currentHistory].slice(0, MAX_DOCUMENT_VERSION_HISTORY);
}

function isRecentVersion(previousCreatedAt: string, nextCreatedAt: string) {
  const previousTime = Date.parse(previousCreatedAt);
  const nextTime = Date.parse(nextCreatedAt);

  if (Number.isNaN(previousTime) || Number.isNaN(nextTime)) {
    return false;
  }

  return nextTime - previousTime < VERSION_HISTORY_MERGE_WINDOW_MS;
}

function hasVersionWorthyContentChange(previousContent: string, nextContent: string) {
  if (isEmptyEditorContent(previousContent) && isEmptyEditorContent(nextContent)) {
    return false;
  }

  return previousContent !== nextContent;
}

function isEmptyEditorContent(content: string) {
  const compact = content.replace(/\s+/g, "").toLowerCase();

  return (
    compact === "" ||
    compact === "<p></p>" ||
    compact === "<p><br></p>" ||
    compact === "<p><br/></p>"
  );
}
