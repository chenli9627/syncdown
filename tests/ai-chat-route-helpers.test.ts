import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiChatMessage } from "../src/features/app-state/types";
import {
  applyEditPlanMetadata,
  createAiChatStreamMessageMetadata,
  sanitizeFinishedMessages,
} from "../src/app/api/ai/chat/[documentId]/route-helpers";

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

test("createAiChatStreamMessageMetadata adds edit plan metadata on finish for streamed edit responses", () => {
  const resolveMetadata = createAiChatStreamMessageMetadata({
    baseMetadata: {
      createdAt: "2026-05-25T00:00:00.000Z",
      documentAction: "edit_blocks",
      modelKey: "primary",
      modelName: "deepseek-v4-flash",
      responseMode: null,
      selection: null,
      threadId: "thread_1",
    },
    documentAction: "edit_blocks",
  });

  resolveMetadata({ part: { type: "start" } });
  resolveMetadata({ part: { text: '{"summary":"已更新任务。","operations":[', type: "text-delta" } });
  resolveMetadata({
    part: {
      text: '{"blockId":"block_1","checked":true,"targetText":"订酒店","type":"set_task_item_checked"}]}',
      type: "text-delta",
    },
  });
  const finishMetadata = resolveMetadata({ part: { type: "finish" } });

  assert.equal(finishMetadata.editPlan?.summary, "已更新任务。");
  assert.equal(finishMetadata.editPlan?.requestedCount, 1);
});

test("applyEditPlanMetadata adds edit plans for deterministic edit payloads", () => {
  const message = {
    id: "msg_deterministic",
    metadata: {
      createdAt: "2026-05-25T00:00:00.000Z",
      documentAction: "edit_blocks",
      modelKey: "primary",
      modelName: "deepseek-v4-flash",
      responseMode: null,
      selection: null,
      threadId: "thread_1",
    },
    parts: [
      {
        text: '{"summary":"已调整标题层级。","operations":[{"blockId":"block_1","level":3,"type":"set_heading_level"}]}',
        type: "text",
      },
    ],
    role: "assistant",
  } satisfies AiChatMessage;

  const nextMessage = applyEditPlanMetadata(message, "edit_blocks");

  assert.equal(nextMessage.metadata?.editPlan?.summary, "已调整标题层级。");
  assert.equal(nextMessage.metadata?.editPlan?.requestedCount, 1);
});
