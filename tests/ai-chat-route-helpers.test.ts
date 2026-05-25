import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiChatMessage } from "../src/features/app-state/types";
import { sanitizeFinishedMessages } from "../src/app/api/ai/chat/[documentId]/route-helpers";

test("sanitizeFinishedMessages adds edit plan metadata to the last edit assistant message", () => {
  const messages = [
    {
      id: "msg_user",
      metadata: {
        createdAt: "2026-05-25T00:00:00.000Z",
      },
      parts: [{ text: "把标题改小一个等级", type: "text" }],
      role: "user",
    },
    {
      id: "msg_assistant",
      metadata: {
        createdAt: "2026-05-25T00:00:01.000Z",
      },
      parts: [
        {
          text: '{"summary":"已调整标题层级。","operations":[{"blockId":"block_1","level":3,"type":"set_heading_level"}]}',
          type: "text",
        },
      ],
      role: "assistant",
    },
  ] satisfies AiChatMessage[];

  const sanitized = sanitizeFinishedMessages(messages, "edit_blocks", null);
  const lastMessage = sanitized[sanitized.length - 1];

  assert.equal(lastMessage.metadata?.editPlan?.summary, "已调整标题层级。");
  assert.equal(lastMessage.metadata?.editPlan?.requestedCount, 1);
});
