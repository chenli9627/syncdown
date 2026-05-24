import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiChatMessage, AiChatThread } from "../src/features/app-state/types";
import { syncAiChatThreadMessages } from "../src/features/editor/hooks/use-ai-chat-threads";

function createMessage(id: string, role: "assistant" | "user", text: string): AiChatMessage {
  return {
    id,
    metadata: {
      createdAt: "2026-05-25T00:00:00.000Z",
      threadId: "thread_1",
    },
    parts: [{ text, type: "text" }],
    role,
  };
}

test("syncAiChatThreadMessages creates a visible thread once the first message arrives", () => {
  const nextThreads = syncAiChatThreadMessages([], "thread_1", "user_1", "doc_1", [
    createMessage("msg_user", "user", "当前文档标题是什么？"),
  ]);

  assert.equal(nextThreads.length, 1);
  assert.equal(nextThreads[0]?.id, "thread_1");
  assert.equal(nextThreads[0]?.messages[0]?.role, "user");
});

test("syncAiChatThreadMessages updates an existing thread with newer messages", () => {
  const existingThreads: AiChatThread[] = [
    {
      createdAt: "2026-05-24T00:00:00.000Z",
      documentId: "doc_1",
      id: "thread_1",
      messages: [createMessage("msg_user", "user", "当前文档标题是什么？")],
      updatedAt: "2026-05-24T00:00:00.000Z",
      userId: "user_1",
    },
  ];

  const nextThreads = syncAiChatThreadMessages(
    existingThreads,
    "thread_1",
    "user_1",
    "doc_1",
    [
      createMessage("msg_user", "user", "当前文档标题是什么？"),
      createMessage("msg_assistant", "assistant", "当前文档标题是 Untitled4。"),
    ],
  );

  assert.equal(nextThreads.length, 1);
  assert.equal(nextThreads[0]?.messages.length, 2);
  assert.equal(nextThreads[0]?.messages[1]?.role, "assistant");
});
