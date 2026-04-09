import test from "node:test";
import assert from "node:assert/strict";
import type { StoredSyntextState } from "../src/features/app-state/types";
import {
  registerUser,
  resetPasswordForUser,
  updateProfileAvatarForUser,
} from "../src/features/app-state/lib/mutations/auth";
import {
  nextRestoredTitle,
  nextUntitledTitle,
  sanitizeEmail,
  sanitizeUsername,
  validatePassword,
} from "../src/features/app-state/lib/mutations/shared";

function createState(): StoredSyntextState {
  return {
    accesses: [],
    documents: [
      {
        content: "",
        createdAt: "2026-04-01T00:00:00.000Z",
        deletedAt: null,
        id: "doc_1",
        lastEditedAt: "2026-04-01T00:00:00.000Z",
        ownerUserId: "user_one",
        status: "private",
        title: "Untitled",
        trashedFromStatus: null,
        workspaceId: "ws_one",
      },
      {
        content: "",
        createdAt: "2026-04-01T00:00:00.000Z",
        deletedAt: null,
        id: "doc_2",
        lastEditedAt: "2026-04-01T00:00:00.000Z",
        ownerUserId: "user_one",
        status: "private",
        title: "Untitled1",
        trashedFromStatus: null,
        workspaceId: "ws_one",
      },
      {
        content: "",
        createdAt: "2026-04-01T00:00:00.000Z",
        deletedAt: null,
        id: "doc_3",
        lastEditedAt: "2026-04-01T00:00:00.000Z",
        ownerUserId: "user_one",
        status: "private",
        title: "Project plan",
        trashedFromStatus: null,
        workspaceId: "ws_one",
      },
      {
        content: "",
        createdAt: "2026-04-01T00:00:00.000Z",
        deletedAt: null,
        id: "doc_4",
        lastEditedAt: "2026-04-01T00:00:00.000Z",
        ownerUserId: "user_one",
        status: "private",
        title: "Project plan (Restored)",
        trashedFromStatus: null,
        workspaceId: "ws_one",
      },
    ],
    recentVisits: [],
    users: [
      {
        avatarUrl: null,
        createdAt: "2026-04-01T00:00:00.000Z",
        email: "one@example.com",
        id: "user_one",
        name: "One",
        password: "onepass123",
        username: "one",
      },
    ],
    workspaces: [
      {
        createdAt: "2026-04-01T00:00:00.000Z",
        id: "ws_one",
        lastAccessedAt: "2026-04-01T00:00:00.000Z",
        name: "Default",
        ownerUserId: "user_one",
      },
    ],
  };
}

test("next untitled title increments without reusing trashed numbering", () => {
  assert.equal(nextUntitledTitle(createState(), "ws_one"), "Untitled2");
});

test("restored titles append restored suffixes", () => {
  assert.equal(
    nextRestoredTitle(createState(), "ws_one", "Project plan", "doc_restore"),
    "Project plan (Restored 2)",
  );
});

test("email and username sanitization trim and lower-case", () => {
  assert.equal(sanitizeEmail("  USER@Example.COM "), "user@example.com");
  assert.equal(sanitizeUsername("  One_User "), "one_user");
});

test("password validation rejects short and chinese passwords", () => {
  assert.equal(validatePassword("short"), "Password must be at least 8 characters");
  assert.equal(validatePassword("password中文"), "Password cannot contain Chinese characters");
  assert.equal(validatePassword("validpass123"), null);
});

test("register user creates a default workspace", () => {
  const result = registerUser(createState(), {
    email: "new@example.com",
    name: "New User",
    password: "validpass123",
    username: "new_user",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.state.users.at(-1)?.username, "new_user");
  assert.equal(result.state.workspaces.at(-1)?.name, "Default");
});

test("reset password rejects invalid passwords", () => {
  const result = resetPasswordForUser(createState(), "one", "short");

  assert.deepEqual(result, {
    error: "Password must be at least 8 characters",
    ok: false,
  });
});

test("profile avatar updates for existing user", () => {
  const result = updateProfileAvatarForUser(
    createState(),
    "user_one",
    "/api/media/avatar-test.png",
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.state.users[0]?.avatarUrl, "/api/media/avatar-test.png");
});
