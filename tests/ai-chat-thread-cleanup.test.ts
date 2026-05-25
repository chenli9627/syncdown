import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiChatThread } from "../src/features/app-state/types";
import {
  mergeNormalizedAiChatThreads,
  normalizeAiChatThreads,
} from "../src/features/app-state/lib/ai-chat-thread-cleanup";

test("normalizes legacy AI edit payload messages into plain summaries", () => {
  const threads: AiChatThread[] = [
    {
      createdAt: "2026-05-25T00:00:00.000Z",
      documentId: "doc_1",
      id: "thread_1",
      messages: [
        {
          id: "msg_1",
          metadata: {
            createdAt: "2026-05-25T00:00:00.000Z",
            documentAction: "edit_blocks",
            threadId: "thread_1",
          },
          parts: [
            {
              text: '{"summary":"已删除景点表格。","operations":[{"type":"delete_block","blockId":"block_1"}]}',
              type: "text",
            },
          ],
          role: "assistant",
        },
      ],
      updatedAt: "2026-05-25T00:00:00.000Z",
      userId: "user_1",
    },
  ];

  const normalized = normalizeAiChatThreads(threads);

  assert.equal(normalized.changed, true);
  assert.equal(
    normalized.threads[0]?.messages[0]?.parts[0]?.type,
    "text",
  );
  assert.equal(
    normalized.threads[0]?.messages[0]?.parts[0]?.text,
    "已删除景点表格。",
  );
  assert.equal(
    normalized.threads[0]?.messages[0]?.metadata?.documentAction,
    undefined,
  );
});

test("mergeNormalizedAiChatThreads writes normalized thread content back into state", () => {
  const state = {
    accesses: [],
    aiChatThreads: [
      {
        createdAt: "2026-05-25T00:00:00.000Z",
        documentId: "doc_1",
        id: "thread_1",
        messages: [],
        updatedAt: "2026-05-25T00:00:00.000Z",
        userId: "user_1",
      },
    ],
    documents: [],
    recentVisits: [],
    users: [],
    workspaces: [],
  };

  const merged = mergeNormalizedAiChatThreads(state, [
    {
      ...state.aiChatThreads[0],
      messages: [
        {
          id: "msg_1",
          metadata: { createdAt: "2026-05-25T00:00:00.000Z" },
          parts: [{ text: "普通摘要", type: "text" }],
          role: "assistant",
        },
      ],
    },
  ]);

  assert.equal(merged.aiChatThreads?.[0]?.messages[0]?.parts[0]?.text, "普通摘要");
});
