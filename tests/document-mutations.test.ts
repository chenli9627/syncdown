import test from "node:test";
import assert from "node:assert/strict";
import type { StoredSyntextState } from "../src/features/app-state/types";
import {
  removeDocumentAccessForOwner,
  shareDocumentWithUser,
} from "../src/features/app-state/lib/mutations/document-access";
import { updateDocumentForUser } from "../src/features/app-state/lib/mutations/document-editing";
import {
  moveDocumentToTrashForOwner,
  restoreDocumentFromTrashForOwner,
} from "../src/features/app-state/lib/mutations/document-trash";

function createState(): StoredSyntextState {
  return {
    accesses: [
      {
        documentId: "doc_shared",
        permission: "can_view",
        userId: "user_two",
      },
    ],
    documents: [
      {
        content: "<p>Shared content</p>",
        createdAt: "2026-04-01T00:00:00.000Z",
        deletedAt: null,
        id: "doc_shared",
        lastEditedAt: "2026-04-03T00:00:00.000Z",
        ownerUserId: "user_one",
        status: "shared",
        title: "Shared doc",
        trashedFromStatus: null,
        workspaceId: "ws_one",
      },
      {
        content: "<p>Existing collision</p>",
        createdAt: "2026-04-01T00:00:00.000Z",
        deletedAt: null,
        id: "doc_collision",
        lastEditedAt: "2026-04-02T00:00:00.000Z",
        ownerUserId: "user_one",
        status: "private",
        title: "Shared doc",
        trashedFromStatus: null,
        workspaceId: "ws_one",
      },
    ],
    recentVisits: [
      {
        documentId: "doc_shared",
        userId: "user_two",
        visitedAt: "2026-04-04T00:00:00.000Z",
      },
    ],
    users: [
      {
        avatarUrl: null,
        createdAt: "2026-04-01T00:00:00.000Z",
        email: "one@example.com",
        id: "user_one",
        name: "One",
        passwordHash: "hash-1",
        username: "one",
      },
      {
        avatarUrl: null,
        createdAt: "2026-04-01T00:00:00.000Z",
        email: "two@example.com",
        id: "user_two",
        name: "Two",
        passwordHash: "hash-2",
        username: "two",
      },
    ],
    workspaces: [
      {
        createdAt: "2026-04-01T00:00:00.000Z",
        id: "ws_one",
        lastAccessedAt: "2026-04-04T00:00:00.000Z",
        name: "Workspace One",
        ownerUserId: "user_one",
      },
    ],
  };
}

test("removing the last guest returns a shared document to private", () => {
  const result = removeDocumentAccessForOwner(createState(), "user_one", "doc_shared", "user_two");

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const document = result.state.documents.find((entry) => entry.id === "doc_shared");
  assert.equal(document?.status, "private");
  assert.equal(
    result.state.accesses.some((entry) => entry.documentId === "doc_shared"),
    false,
  );
});

test("restoring a trashed document resolves title collisions", () => {
  const moved = moveDocumentToTrashForOwner(createState(), "user_one", "doc_shared");

  assert.equal(moved.ok, true);
  if (!moved.ok) {
    return;
  }

  const restored = restoreDocumentFromTrashForOwner(moved.state, "user_one", "doc_shared");
  assert.equal(restored.ok, true);
  if (!restored.ok) {
    return;
  }

  const document = restored.state.documents.find((entry) => entry.id === "doc_shared");
  assert.equal(document?.status, "shared");
  assert.equal(document?.title, "Shared doc (Restored)");
});

test("guest cannot edit document title", () => {
  const result = updateDocumentForUser(createState(), "user_two", "doc_shared", {
    title: "New title",
  });

  assert.deepEqual(result, {
    error: "Only the workspace owner can edit the document title",
    ok: false,
  });
});

test("sharing with yourself is rejected", () => {
  const result = shareDocumentWithUser(
    createState(),
    "user_one",
    "doc_shared",
    "one@example.com",
    "can_view",
  );

  assert.deepEqual(result, {
    error: "You cannot share a document with yourself",
    ok: false,
  });
});
