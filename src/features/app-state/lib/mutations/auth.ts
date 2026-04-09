import type {
  Session,
  StoredSyntextState,
  StoredUser,
} from "@/features/app-state/types";
import {
  chineseCharacterPattern,
  makeWorkspace,
  now,
  sanitizeEmail,
  sanitizeProfileName,
  sanitizeUsername,
  usernamePattern,
  validatePassword,
} from "@/features/app-state/lib/mutations/shared";

type RegisterInput = {
  email: string;
  username: string;
  name: string;
  password: string;
};

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

export function updateProfileNameForUser(
  state: StoredSyntextState,
  userId: string,
  rawName: string,
) {
  const name = sanitizeProfileName(rawName);

  if (!name) {
    return { ok: false as const, error: "Name is required" };
  }

  if (!state.users.some((user) => user.id === userId)) {
    return { ok: false as const, error: "User does not exist" };
  }

  return {
    ok: true as const,
    state: {
      ...state,
      users: state.users.map((user) =>
        user.id === userId ? { ...user, name } : user,
      ),
    },
  };
}

export function updateProfileAvatarForUser(
  state: StoredSyntextState,
  userId: string,
  rawAvatarUrl: string | null,
) {
  const avatarUrl = rawAvatarUrl?.trim() || null;

  if (!state.users.some((user) => user.id === userId)) {
    return { ok: false as const, error: "User does not exist" };
  }

  return {
    ok: true as const,
    state: {
      ...state,
      users: state.users.map((user) =>
        user.id === userId ? { ...user, avatarUrl } : user,
      ),
    },
  };
}

export function changePasswordForUser(
  state: StoredSyntextState,
  userId: string,
  currentPassword: string,
  nextPassword: string,
) {
  const user = state.users.find((item) => item.id === userId);

  if (!user) {
    return { ok: false as const, error: "User does not exist" };
  }

  if (user.password !== currentPassword) {
    return { ok: false as const, error: "Current password is incorrect" };
  }

  const passwordError = validatePassword(nextPassword);

  if (passwordError) {
    return { ok: false as const, error: passwordError };
  }

  return {
    ok: true as const,
    state: {
      ...state,
      users: state.users.map((item) =>
        item.id === userId ? { ...item, password: nextPassword } : item,
      ),
    },
  };
}
