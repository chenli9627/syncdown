import type {
  DocumentRecord,
  StoredSyntextState,
  Workspace,
} from "@/features/app-state/types";

const chineseCharacterPattern = /[\u3400-\u9fff]/u;
const usernamePattern = /^[a-z0-9_]+$/;

export { chineseCharacterPattern, usernamePattern };

export function now() {
  return new Date().toISOString();
}

export function makeWorkspace(ownerUserId: string, name: string): Workspace {
  const createdAt = now();

  return {
    id: `workspace_${crypto.randomUUID()}`,
    ownerUserId,
    name,
    createdAt,
    lastAccessedAt: createdAt,
  };
}

export function getDocumentById(state: StoredSyntextState, documentId: string) {
  return state.documents.find((document) => document.id === documentId) ?? null;
}

export function getWorkspaceById(state: StoredSyntextState, workspaceId: string) {
  return state.workspaces.find((workspace) => workspace.id === workspaceId) ?? null;
}

export function getDocumentPermissionForUser(
  state: StoredSyntextState,
  userId: string,
  document: DocumentRecord,
) {
  const workspace = getWorkspaceById(state, document.workspaceId);

  if (workspace?.ownerUserId === userId) {
    return "owner" as const;
  }

  return (
    state.accesses.find(
      (access) => access.documentId === document.id && access.userId === userId,
    )?.permission ?? null
  );
}

export function canOpenDocument(
  state: StoredSyntextState,
  userId: string,
  document: DocumentRecord,
) {
  if (document.status === "trashed") {
    return false;
  }

  return getDocumentPermissionForUser(state, userId, document) !== null;
}

export function nextUntitledTitle(state: StoredSyntextState, workspaceId: string) {
  const takenTitles = new Set(
    state.documents
      .filter(
        (document) =>
          document.workspaceId === workspaceId && document.status !== "trashed",
      )
      .map((document) => document.title),
  );

  if (!takenTitles.has("Untitled")) {
    return "Untitled";
  }

  let index = 1;

  while (takenTitles.has(`Untitled${index}`)) {
    index += 1;
  }

  return `Untitled${index}`;
}

export function normalizeDocumentTitle(
  state: StoredSyntextState,
  workspaceId: string,
  title: string,
) {
  const trimmed = title.trim();

  if (trimmed) {
    return trimmed;
  }

  return nextUntitledTitle(state, workspaceId);
}

export function titleExistsInWorkspace(
  state: StoredSyntextState,
  workspaceId: string,
  title: string,
  currentDocumentId?: string,
) {
  return state.documents.some(
    (document) =>
      document.workspaceId === workspaceId &&
      document.status !== "trashed" &&
      document.id !== currentDocumentId &&
      document.title === title,
  );
}

export function nextRestoredTitle(
  state: StoredSyntextState,
  workspaceId: string,
  originalTitle: string,
  currentDocumentId: string,
) {
  if (!titleExistsInWorkspace(state, workspaceId, originalTitle, currentDocumentId)) {
    return originalTitle;
  }

  const baseTitle = `${originalTitle} (Restored)`;

  if (!titleExistsInWorkspace(state, workspaceId, baseTitle, currentDocumentId)) {
    return baseTitle;
  }

  let index = 2;

  while (
    titleExistsInWorkspace(
      state,
      workspaceId,
      `${originalTitle} (Restored ${index})`,
      currentDocumentId,
    )
  ) {
    index += 1;
  }

  return `${originalTitle} (Restored ${index})`;
}

export function upsertRecentVisit(
  state: StoredSyntextState,
  userId: string,
  documentId: string,
  visitedAt: string,
) {
  const remainingVisits = state.recentVisits.filter(
    (visit) => !(visit.userId === userId && visit.documentId === documentId),
  );

  return [...remainingVisits, { userId, documentId, visitedAt }];
}

export function getUserById(state: StoredSyntextState, userId: string) {
  return state.users.find((user) => user.id === userId) ?? null;
}

export function getUserByEmail(state: StoredSyntextState, email: string) {
  return state.users.find((user) => user.email === email) ?? null;
}

export function getDocumentAccesses(state: StoredSyntextState, documentId: string) {
  return state.accesses.filter((access) => access.documentId === documentId);
}

export function isWorkspaceOwnerForDocument(
  state: StoredSyntextState,
  userId: string,
  document: DocumentRecord,
) {
  const workspace = getWorkspaceById(state, document.workspaceId);
  return workspace?.ownerUserId === userId;
}

export function getWorkspaceOwnerIdForDocument(
  state: StoredSyntextState,
  document: DocumentRecord,
) {
  return getWorkspaceById(state, document.workspaceId)?.ownerUserId ?? null;
}

export function sanitizeWorkspaceName(name: string) {
  return name.trim();
}

export function sanitizeProfileName(name: string) {
  return name.trim();
}

export function sanitizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function sanitizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function validatePassword(password: string) {
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (chineseCharacterPattern.test(password)) {
    return "Password cannot contain Chinese characters";
  }

  return null;
}
