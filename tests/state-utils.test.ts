import test from "node:test";
import assert from "node:assert/strict";
import type { SyntextState, User } from "../src/features/app-state/types";
import {
  canUserOpenDocument,
  getAccessibleWorkspaceIds,
  getWorkspaceBuckets,
} from "../src/features/app-state/lib/state-utils";

const one: User = {
  avatarUrl: null,
  createdAt: "2026-04-01T00:00:00.000Z",
  email: "one@example.com",
  id: "user_one",
  name: "One",
  username: "one",
};

const two: User = {
  avatarUrl: null,
  createdAt: "2026-04-01T00:00:00.000Z",
  email: "two@example.com",
  id: "user_two",
  name: "Two",
  username: "two",
};

function createState(): SyntextState {
  return {
    accesses: [
      {
        documentId: "doc_shared",
        permission: "can_edit",
        userId: "user_two",
      },
    ],
    documents: [
      {
        content: "<p>Private</p>",
        createdAt: "2026-04-01T00:00:00.000Z",
        id: "doc_private",
        lastEditedAt: "2026-04-04T00:00:00.000Z",
        ownerUserId: "user_one",
        status: "private",
        title: "Private notes",
        workspaceId: "ws_one",
      },
      {
        content: "<p>Shared</p>",
        createdAt: "2026-04-01T00:00:00.000Z",
        id: "doc_shared",
        lastEditedAt: "2026-04-05T00:00:00.000Z",
        ownerUserId: "user_one",
        status: "shared",
        title: "Shared brief",
        workspaceId: "ws_one",
      },
      {
        content: "<p>Trash</p>",
        createdAt: "2026-04-01T00:00:00.000Z",
        id: "doc_trashed",
        lastEditedAt: "2026-04-03T00:00:00.000Z",
        ownerUserId: "user_one",
        status: "trashed",
        title: "Trashed page",
        workspaceId: "ws_one",
      },
    ],
    recentVisits: [
      {
        documentId: "doc_shared",
        userId: "user_two",
        visitedAt: "2026-04-06T00:00:00.000Z",
      },
    ],
    users: [one, two],
    workspaces: [
      {
        createdAt: "2026-04-01T00:00:00.000Z",
        id: "ws_one",
        lastAccessedAt: "2026-04-06T00:00:00.000Z",
        name: "Workspace One",
        ownerUserId: "user_one",
      },
    ],
  };
}

test("guest can only open shared document they have access to", () => {
  const state = createState();

  assert.equal(canUserOpenDocument(state, two, "doc_shared"), true);
  assert.equal(canUserOpenDocument(state, two, "doc_private"), false);
  assert.equal(canUserOpenDocument(state, two, "doc_trashed"), false);
});

test("accessible workspace ids include owned and shared workspaces", () => {
  const state = createState();

  assert.deepEqual(getAccessibleWorkspaceIds(state, one), ["ws_one"]);
  assert.deepEqual(getAccessibleWorkspaceIds(state, two), ["ws_one"]);
});

test("workspace buckets hide private and trash from guest view", () => {
  const state = createState();
  const guestBuckets = getWorkspaceBuckets(state, "ws_one", two);
  const ownerBuckets = getWorkspaceBuckets(state, "ws_one", one);

  assert.deepEqual(guestBuckets.shared.map((entry) => entry.id), ["doc_shared"]);
  assert.deepEqual(guestBuckets.privateDocs, []);
  assert.deepEqual(guestBuckets.trash, []);
  assert.deepEqual(ownerBuckets.privateDocs.map((entry) => entry.id), ["doc_private"]);
  assert.deepEqual(ownerBuckets.trash.map((entry) => entry.id), ["doc_trashed"]);
});

test("guest keeps shared document after permission changes", () => {
  const state = createState();
  state.accesses = state.accesses.map((entry) =>
    entry.documentId === "doc_shared" && entry.userId === "user_two"
      ? { ...entry, permission: "can_view" as const }
      : entry,
  );

  const guestBuckets = getWorkspaceBuckets(state, "ws_one", two);

  assert.deepEqual(guestBuckets.shared.map((entry) => entry.id), ["doc_shared"]);
});
