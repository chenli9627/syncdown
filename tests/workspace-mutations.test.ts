import test from "node:test";
import assert from "node:assert/strict";
import type { StoredSyntextState } from "../src/features/app-state/types";
import { deleteWorkspaceForUser } from "../src/features/app-state/lib/mutations/workspace";

function createState(): StoredSyntextState {
  return {
    accesses: [
      {
        documentId: "doc_one",
        permission: "can_edit",
        userId: "user_two",
      },
    ],
    documents: [
      {
        content: '<p><img src="/api/media/workspace-file.png" /></p>',
        createdAt: "2026-04-01T00:00:00.000Z",
        deletedAt: null,
        id: "doc_one",
        lastEditedAt: "2026-04-03T00:00:00.000Z",
        ownerUserId: "user_one",
        status: "shared",
        title: "Workspace doc",
        trashedFromStatus: null,
        workspaceId: "ws_one",
      },
    ],
    recentVisits: [
      {
        documentId: "doc_one",
        userId: "user_two",
        visitedAt: "2026-04-03T00:00:00.000Z",
      },
    ],
    users: [
      {
        avatarUrl: null,
        createdAt: "2026-04-01T00:00:00.000Z",
        email: "one@example.com",
        id: "user_one",
        name: "One",
        password: "secret-1",
        username: "one",
      },
      {
        avatarUrl: null,
        createdAt: "2026-04-01T00:00:00.000Z",
        email: "two@example.com",
        id: "user_two",
        name: "Two",
        password: "secret-2",
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

test("deleting the last owned workspace recreates Default and removes workspace documents", () => {
  const result = deleteWorkspaceForUser(
    createState(),
    "user_one",
    "ws_one",
    "Workspace One",
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.state.documents.length, 0);
  assert.equal(result.state.accesses.length, 0);
  assert.equal(result.state.recentVisits.length, 0);
  assert.equal(result.state.workspaces.length, 1);
  assert.equal(result.state.workspaces[0]?.name, "Default");
  assert.equal(result.state.workspaces[0]?.ownerUserId, "user_one");
});
