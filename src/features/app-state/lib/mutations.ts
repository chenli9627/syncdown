import type {
  Permission,
  DocumentRecord,
  Session,
  StoredSyntextState,
  StoredUser,
  Workspace,
} from "@/features/app-state/types";

type RegisterInput = {
  email: string;
  username: string;
  name: string;
  password: string;
};

const chineseCharacterPattern = /[\u3400-\u9fff]/u;
const usernamePattern = /^[a-z0-9_]+$/;

function now() {
  return new Date().toISOString();
}

function makeWorkspace(ownerUserId: string, name: string): Workspace {
  const createdAt = now();

  return {
    id: `workspace_${crypto.randomUUID()}`,
    ownerUserId,
    name,
    createdAt,
    lastAccessedAt: createdAt,
  };
}

function getDocumentById(state: StoredSyntextState, documentId: string) {
  return state.documents.find((document) => document.id === documentId) ?? null;
}

function getWorkspaceById(state: StoredSyntextState, workspaceId: string) {
  return state.workspaces.find((workspace) => workspace.id === workspaceId) ?? null;
}

function getDocumentPermissionForUser(
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

function canOpenDocument(
  state: StoredSyntextState,
  userId: string,
  document: DocumentRecord,
) {
  if (document.status === "trashed") {
    return false;
  }

  return getDocumentPermissionForUser(state, userId, document) !== null;
}

function nextUntitledTitle(state: StoredSyntextState, workspaceId: string) {
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

function normalizeDocumentTitle(state: StoredSyntextState, workspaceId: string, title: string) {
  const trimmed = title.trim();

  if (trimmed) {
    return trimmed;
  }

  return nextUntitledTitle(state, workspaceId);
}

function titleExistsInWorkspace(
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

function nextRestoredTitle(
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

function upsertRecentVisit(
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

function getUserById(state: StoredSyntextState, userId: string) {
  return state.users.find((user) => user.id === userId) ?? null;
}

function getUserByEmail(state: StoredSyntextState, email: string) {
  return state.users.find((user) => user.email === email) ?? null;
}

function getDocumentAccesses(state: StoredSyntextState, documentId: string) {
  return state.accesses.filter((access) => access.documentId === documentId);
}

function isWorkspaceOwnerForDocument(
  state: StoredSyntextState,
  userId: string,
  document: DocumentRecord,
) {
  const workspace = getWorkspaceById(state, document.workspaceId);
  return workspace?.ownerUserId === userId;
}

function getWorkspaceOwnerIdForDocument(
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

export function registerUser(state: StoredSyntextState, input: RegisterInput) {
  const email = sanitizeEmail(input.email);
  const username = sanitizeUsername(input.username);
  const name = sanitizeProfileName(input.name);
  const password = input.password;

  if (!email) {
    return { ok: false as const, error: "Email is required" };
  }

  if (chineseCharacterPattern.test(email)) {
    return { ok: false as const, error: "Email cannot contain Chinese characters" };
  }

  if (state.users.some((user) => user.email === email)) {
    return { ok: false as const, error: "Email already exists" };
  }

  if (!username) {
    return { ok: false as const, error: "Username is required" };
  }

  if (chineseCharacterPattern.test(username)) {
    return { ok: false as const, error: "Username cannot contain Chinese characters" };
  }

  if (!usernamePattern.test(username)) {
    return {
      ok: false as const,
      error: "Username only allows letters, digits, and underscores",
    };
  }

  if (state.users.some((user) => user.username === username)) {
    return { ok: false as const, error: "Username already exists" };
  }

  if (!name) {
    return { ok: false as const, error: "Name is required" };
  }

  const passwordError = validatePassword(password);

  if (passwordError) {
    return { ok: false as const, error: passwordError };
  }

  const user: StoredUser = {
    id: `user_${crypto.randomUUID()}`,
    email,
    username,
    name,
    password,
    avatarUrl: null,
    createdAt: now(),
  };

  const defaultWorkspace = makeWorkspace(user.id, "Default");

  return {
    ok: true as const,
    state: {
      ...state,
      users: [...state.users, user],
      workspaces: [...state.workspaces, defaultWorkspace],
    },
  };
}

export function loginUser(
  state: StoredSyntextState,
  username: string,
  password: string,
) {
  const normalizedUsername = sanitizeUsername(username);

  const user = state.users.find(
    (item) => item.username === normalizedUsername && item.password === password,
  );

  if (!user) {
    return { ok: false as const, error: "Invalid username or password" };
  }

  const accessibleWorkspaceIds = new Set(
    state.workspaces
      .filter((workspace) => workspace.ownerUserId === user.id)
      .map((workspace) => workspace.id),
  );

  state.accesses
    .filter((access) => access.userId === user.id)
    .forEach((access) => {
      const document = state.documents.find((item) => item.id === access.documentId);

      if (document && document.status !== "trashed") {
        accessibleWorkspaceIds.add(document.workspaceId);
      }
    });

  const nextWorkspace = state.workspaces
    .filter((workspace) => accessibleWorkspaceIds.has(workspace.id))
    .sort(
      (left, right) =>
        new Date(right.lastAccessedAt).getTime() -
        new Date(left.lastAccessedAt).getTime(),
    )[0];

  if (!nextWorkspace) {
    return { ok: false as const, error: "No workspace is available" };
  }

  const loginAt = now();

  return {
    ok: true as const,
    session: {
      userId: user.id,
      currentWorkspaceId: nextWorkspace.id,
    } satisfies Session,
    state: {
      ...state,
      workspaces: state.workspaces.map((workspace) =>
        workspace.id === nextWorkspace.id
          ? { ...workspace, lastAccessedAt: loginAt }
          : workspace,
      ),
    },
  };
}

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

  const targetWorkspace = state.workspaces.find((workspace) => workspace.id === workspaceId);

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
  const targetWorkspace = state.workspaces.find((workspace) => workspace.id === workspaceId);

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

export function resetPasswordForUser(
  state: StoredSyntextState,
  username: string,
  password: string,
) {
  const normalizedUsername = sanitizeUsername(username);
  const passwordError = validatePassword(password);

  if (passwordError) {
    return { ok: false as const, error: passwordError };
  }

  if (!state.users.some((user) => user.username === normalizedUsername)) {
    return { ok: false as const, error: "Username does not exist" };
  }

  return {
    ok: true as const,
    state: {
      ...state,
      users: state.users.map((user) =>
        user.username === normalizedUsername ? { ...user, password } : user,
      ),
    },
  };
}

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

  const hasRemainingGuests = getDocumentAccesses(
    { ...state, accesses: nextAccesses },
    documentId,
  ).length > 0;
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
              trashedFromStatus: item.status === "trashed" ? item.trashedFromStatus ?? "private" : item.status,
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
