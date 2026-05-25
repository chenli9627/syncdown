import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiChatMessage } from "../src/features/app-state/types";
import {
  getAiChatMessageEditPlan,
  withAiChatMessageEditPlan,
} from "../src/features/editor/lib/ai-chat-message-edit-plan";

test("reads edit plan from message metadata when present", () => {
  const message = {
    id: "msg_1",
    metadata: {
      createdAt: "2026-05-25T00:00:00.000Z",
      documentAction: "edit_blocks",
      editPlan: {
        payload: {
          operations: [{ blockId: "block_1", level: 3, type: "set_heading_level" }],
          summary: "已调整标题层级。",
        },
        previewLines: ["将标题调整为 3 级"],
        requestedCount: 1,
        responseText:
          '{"summary":"已调整标题层级。","operations":[{"blockId":"block_1","level":3,"type":"set_heading_level"}]}',
        summary: "已调整标题层级。",
      },
    },
    parts: [{ text: "ignored", type: "text" }],
    role: "assistant",
  } satisfies AiChatMessage;

  assert.equal(getAiChatMessageEditPlan(message)?.summary, "已调整标题层级。");
});

test("falls back to parsing edit plan from assistant text", () => {
  const message = {
    id: "msg_2",
    metadata: {
      createdAt: "2026-05-25T00:00:00.000Z",
      documentAction: "edit_blocks",
    },
    parts: [
      {
        text: '{"summary":"已更新任务。","operations":[{"blockId":"block_1","checked":true,"targetText":"订酒店","type":"set_task_item_checked"}]}',
        type: "text",
      },
    ],
    role: "assistant",
  } satisfies AiChatMessage;

  const plan = getAiChatMessageEditPlan(message);

  assert.equal(plan?.requestedCount, 1);
  assert.deepEqual(plan?.previewLines, ["将勾选任务“订酒店”"]);
});

test("can disable text fallback for current-turn edit plan resolution", () => {
  const message = {
    id: "msg_2b",
    metadata: {
      createdAt: "2026-05-25T00:00:00.000Z",
      documentAction: "edit_blocks",
    },
    parts: [
      {
        text: '{"summary":"已更新任务。","operations":[{"blockId":"block_1","checked":true,"targetText":"订酒店","type":"set_task_item_checked"}]}',
        type: "text",
      },
    ],
    role: "assistant",
  } satisfies AiChatMessage;

  assert.equal(
    getAiChatMessageEditPlan(message, "edit_blocks", { allowTextFallback: false }),
    null,
  );
});

test("adds edit plan metadata to edit-block assistant messages", () => {
  const message = {
    id: "msg_3",
    metadata: {
      createdAt: "2026-05-25T00:00:00.000Z",
      documentAction: "edit_blocks",
    },
    parts: [
      {
        text: '{"summary":"已删除一个块。","operations":[{"blockId":"block_1","type":"delete_block"}]}',
        type: "text",
      },
    ],
    role: "assistant",
  } satisfies AiChatMessage;

  const nextMessage = withAiChatMessageEditPlan(message);

  assert.equal(nextMessage.metadata?.editPlan?.summary, "已删除一个块。");
  assert.equal(nextMessage.metadata?.editPlan?.requestedCount, 1);
});
