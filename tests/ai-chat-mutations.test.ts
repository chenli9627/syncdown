import test from "node:test";
import assert from "node:assert/strict";
import type { AiChatMessage, StoredSyntextState } from "../src/features/app-state/types";
import {
  deleteAiChatThreadForUser,
  getAiChatThreadForUser,
  getAiChatThreadsForUser,
  saveAiChatThreadMessages,
} from "../src/features/app-state/lib/mutations/ai-chat";
import { permanentlyDeleteDocumentFromTrashForOwner } from "../src/features/app-state/lib/mutations/document-trash";

const message: AiChatMessage = {
  id: "msg_1",
  metadata: {
    createdAt: "2026-05-01T00:00:00.000Z",
    modelKey: "primary",
    modelName: "deepseek-v4-flash",
    selection: null,
  },
  parts: [{ text: "Summarize this", type: "text" }],
  role: "user",
};

function createState(): StoredSyntextState {
  return {
    accesses: [
      {
        documentId: "doc_shared",
        permission: "can_view",
        userId: "user_viewer",
      },
    ],
    documents: [
      {
        content: "<p>Shared content</p>",
        createdAt: "2026-04-01T00:00:00.000Z",
        deletedAt: null,
        id: "doc_shared",
        lastEditedAt: "2026-04-03T00:00:00.000Z",
        ownerUserId: "user_owner",
        status: "shared",
        title: "Shared doc",
        trashedFromStatus: null,
        workspaceId: "ws_owner",
      },
    ],
    recentVisits: [],
    users: [
      {
        avatarUrl: null,
        createdAt: "2026-04-01T00:00:00.000Z",
        email: "owner@example.com",
        id: "user_owner",
        name: "Owner",
        password: "hash-1",
        username: "owner",
      },
      {
        avatarUrl: null,
        createdAt: "2026-04-01T00:00:00.000Z",
        email: "viewer@example.com",
        id: "user_viewer",
        name: "Viewer",
        password: "hash-2",
        username: "viewer",
      },
    ],
    workspaces: [
      {
        createdAt: "2026-04-01T00:00:00.000Z",
        id: "ws_owner",
        lastAccessedAt: "2026-04-04T00:00:00.000Z",
        name: "Owner Workspace",
        ownerUserId: "user_owner",
      },
    ],
  };
}

test("AI chat persists by document and user", () => {
  const result = saveAiChatThreadMessages(createState(), "user_owner", "doc_shared", [message]);

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const loaded = getAiChatThreadForUser(result.state, "user_owner", "doc_shared");
  assert.equal(loaded.ok, true);
  if (!loaded.ok) {
    return;
  }

  assert.equal(loaded.thread?.documentId, "doc_shared");
  assert.equal(loaded.thread?.userId, "user_owner");
  assert.deepEqual(loaded.thread?.messages, [message]);
});

test("AI chat supports multiple threads per document and user", () => {
  const first = saveAiChatThreadMessages(createState(), "user_owner", "doc_shared", [message], {
    threadId: "ai_chat_first",
  });

  assert.equal(first.ok, true);
  if (!first.ok) {
    return;
  }

  const secondMessage: AiChatMessage = {
    ...message,
    id: "msg_2",
    parts: [{ text: "Translate this", type: "text" }],
  };
  const second = saveAiChatThreadMessages(
    first.state,
    "user_owner",
    "doc_shared",
    [secondMessage],
    { threadId: "ai_chat_second" },
  );

  assert.equal(second.ok, true);
  if (!second.ok) {
    return;
  }

  const threads = getAiChatThreadsForUser(second.state, "user_owner", "doc_shared");
  assert.equal(threads.ok, true);
  if (!threads.ok) {
    return;
  }

  assert.deepEqual(
    threads.threads.map((thread) => thread.id).sort(),
    ["ai_chat_first", "ai_chat_second"],
  );

  const loadedFirst = getAiChatThreadForUser(
    second.state,
    "user_owner",
    "doc_shared",
    "ai_chat_first",
  );

  assert.equal(loadedFirst.ok, true);
  if (!loadedFirst.ok) {
    return;
  }

  assert.deepEqual(loadedFirst.thread?.messages, [message]);
});

test("view-only guests cannot use AI chat", () => {
  const result = saveAiChatThreadMessages(createState(), "user_viewer", "doc_shared", [message]);

  assert.equal(result.ok, false);
});

test("AI chat thread deletion removes only the requested thread", () => {
  const first = saveAiChatThreadMessages(createState(), "user_owner", "doc_shared", [message], {
    threadId: "ai_chat_first",
  });

  assert.equal(first.ok, true);
  if (!first.ok) {
    return;
  }

  const second = saveAiChatThreadMessages(first.state, "user_owner", "doc_shared", [message], {
    threadId: "ai_chat_second",
  });

  assert.equal(second.ok, true);
  if (!second.ok) {
    return;
  }

  const deleted = deleteAiChatThreadForUser(
    second.state,
    "user_owner",
    "doc_shared",
    "ai_chat_first",
  );

  assert.equal(deleted.ok, true);
  if (!deleted.ok) {
    return;
  }

  assert.deepEqual(
    deleted.threads.map((thread) => thread.id),
    ["ai_chat_second"],
  );
});

test("permanent document deletion removes AI chat threads", () => {
  const saved = saveAiChatThreadMessages(createState(), "user_owner", "doc_shared", [message]);

  assert.equal(saved.ok, true);
  if (!saved.ok) {
    return;
  }

  const trashedState: StoredSyntextState = {
    ...saved.state,
    documents: saved.state.documents.map((document) => ({
      ...document,
      status: "trashed" as const,
      trashedFromStatus: "shared" as const,
    })),
  };
  const deleted = permanentlyDeleteDocumentFromTrashForOwner(
    trashedState,
    "user_owner",
    "doc_shared",
  );

  assert.equal(deleted.ok, true);
  if (!deleted.ok) {
    return;
  }

  assert.equal(deleted.state.aiChatThreads?.length, 0);
});
