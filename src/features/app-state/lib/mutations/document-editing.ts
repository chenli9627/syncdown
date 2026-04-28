import type {
  DocumentUpdate,
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
const MAX_DOCUMENT_UPDATE_HISTORY = 200;
export type VersionHistoryMode = "force" | "merge" | "snapshot";

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
    versionHistoryMode?: VersionHistoryMode;
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
  const updateHistory = appendDocumentUpdate(document, {
    editedAt,
    nextContent,
    nextTitle,
    userId,
  });
  const versionHistory = resolveVersionHistory({
    contentChanged,
    document,
    editedAt,
    mode: input.versionHistoryMode ?? "merge",
    nextContent,
    nextTitle,
    userId,
  });

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
              updateHistory,
              versionHistory,
            }
          : item,
      ),
      recentVisits: upsertRecentVisit(state, userId, documentId, editedAt),
    },
  };
}

function appendDocumentUpdate(
  document: DocumentRecord,
  {
    editedAt,
    nextContent,
    nextTitle,
    userId,
  }: {
    editedAt: string;
    nextContent: string;
    nextTitle: string;
    userId: string;
  },
): DocumentUpdate[] | undefined {
  if (document.title === nextTitle && document.content === nextContent) {
    return document.updateHistory;
  }

  return [
    {
      createdAt: editedAt,
      id: `update_${crypto.randomUUID()}`,
      nextContent,
      nextTitle,
      previousContent: document.content,
      previousTitle: document.title,
      userId,
    },
    ...(document.updateHistory ?? []),
  ].slice(0, MAX_DOCUMENT_UPDATE_HISTORY);
}

function resolveVersionHistory({
  contentChanged,
  document,
  editedAt,
  mode,
  nextContent,
  nextTitle,
  userId,
}: {
  contentChanged: boolean;
  document: DocumentRecord;
  editedAt: string;
  mode: VersionHistoryMode;
  nextContent: string;
  nextTitle: string;
  userId: string;
}) {
  if (mode === "snapshot") {
    return appendVersionSnapshot(
      {
        ...document,
        content: nextContent,
        title: nextTitle,
      },
      userId,
      editedAt,
      document.versionHistory,
    );
  }

  return contentChanged
    ? updateVersionHistory(document, userId, editedAt, mode)
    : document.versionHistory;
}

function updateVersionHistory(
  document: DocumentRecord,
  userId: string,
  editedAt: string,
  mode: Exclude<VersionHistoryMode, "snapshot">,
): DocumentVersion[] | undefined {
  const currentHistory = document.versionHistory ?? [];
  const latest = currentHistory[0] ?? null;

  if (latest && mode === "merge" && isRecentVersion(latest.createdAt, editedAt)) {
    return currentHistory;
  }

  return appendVersionSnapshot(document, userId, editedAt, document.versionHistory);
}

function appendVersionSnapshot(
  document: Pick<DocumentRecord, "content" | "title">,
  userId: string,
  editedAt: string,
  currentHistoryInput: DocumentVersion[] | undefined,
): DocumentVersion[] | undefined {
  const currentHistory = currentHistoryInput ?? [];
  const snapshot: DocumentVersion = {
    id: `version_${crypto.randomUUID()}`,
    title: document.title,
    content: document.content,
    createdAt: editedAt,
    userId,
  };
  const latest = currentHistory[0] ?? null;
  const normalizedSnapshotContent = normalizeVersionContent(snapshot.content);

  if (latest?.content === snapshot.content && latest.title === snapshot.title) {
    return currentHistoryInput;
  }

  if (normalizedSnapshotContent === "") {
    return currentHistoryInput;
  }

  if (
    currentHistory.some(
      (version) => version.title === snapshot.title && version.content === snapshot.content,
    )
  ) {
    return currentHistoryInput;
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
  if (previousContent === nextContent) {
    return false;
  }

  return normalizeVersionContent(nextContent) !== "";
}

function normalizeVersionContent(content: string) {
  return decodeHtmlEntities(content)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote|pre)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n+/g, "\n")
    .trim();
}

function decodeHtmlEntities(content: string) {
  return content
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, value: string) => {
      const codePoint = Number.parseInt(value, 10);

      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : "";
    })
    .replace(/&#x([\da-f]+);/gi, (_match, value: string) => {
      const codePoint = Number.parseInt(value, 16);

      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : "";
    });
}
