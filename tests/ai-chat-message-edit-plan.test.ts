import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiChatMessage } from "../src/features/app-state/types";
import {
  getAiChatMessageEditPlan,
  withAiChatMessagesEditPlans,
  withAiChatMessageEditPlan,
  withAiChatThreadsEditPlans,
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

test("can parse edit plan text even when document-action metadata is missing", () => {
  const message = {
    id: "msg_2_meta_less",
    metadata: {
      createdAt: "2026-05-25T00:00:00.000Z",
    },
    parts: [
      {
        text: '{"summary":"已删除一个块。","operations":[{"blockId":"block_1","type":"delete_block"}]}',
        type: "text",
      },
    ],
    role: "assistant",
  } satisfies AiChatMessage;

  const plan = getAiChatMessageEditPlan(message, "edit_blocks", {
    allowTextFallback: true,
  });

  assert.equal(plan?.summary, "已删除一个块。");
  assert.equal(plan?.requestedCount, 1);
});

test("normalizes move-before aliases from model output", () => {
  const message = {
    id: "msg_2a",
    metadata: {
      createdAt: "2026-05-25T00:00:00.000Z",
      documentAction: "edit_blocks",
    },
    parts: [
      {
        text: '{"summary":"已互换位置。","operations":[{"blockId":"block_11","targetBlockId":"block_9","type":"move_before_block"}]}',
        type: "text",
      },
    ],
    role: "assistant",
  } satisfies AiChatMessage;

  const plan = getAiChatMessageEditPlan(message);

  assert.deepEqual(plan?.payload.operations, [
    {
      blockId: "block_11",
      placement: "before",
      targetBlockId: "block_9",
      type: "move_block",
    },
  ]);
  assert.deepEqual(plan?.previewLines, ["将移动一个块"]);
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

test("hydrates loaded assistant messages with edit plan metadata", () => {
  const messages = withAiChatMessagesEditPlans([
    {
      id: "msg_4",
      metadata: {
        createdAt: "2026-05-25T00:00:00.000Z",
        documentAction: "edit_blocks",
      },
      parts: [
        {
          text: '{"summary":"已勾选任务。","operations":[{"blockId":"block_1","checked":true,"targetText":"订酒店","type":"set_task_item_checked"}]}',
          type: "text",
        },
      ],
      role: "assistant",
    },
  ] satisfies AiChatMessage[]);

  assert.equal(messages[0]?.metadata?.editPlan?.summary, "已勾选任务。");
});

test("hydrates loaded threads with edit plan metadata", () => {
  const threads = withAiChatThreadsEditPlans([
    {
      createdAt: "2026-05-25T00:00:00.000Z",
      documentId: "doc_1",
      id: "thread_1",
      messages: [
        {
          id: "msg_5",
          metadata: {
            createdAt: "2026-05-25T00:00:01.000Z",
            documentAction: "edit_blocks",
          },
          parts: [
            {
              text: '{"summary":"已调整标题层级。","operations":[{"blockId":"block_1","level":3,"type":"set_heading_level"}]}',
              type: "text",
            },
          ],
          role: "assistant",
        },
      ],
      updatedAt: "2026-05-25T00:00:02.000Z",
      userId: "user_1",
    },
  ]);

  assert.equal(
    threads[0]?.messages[0]?.metadata?.editPlan?.summary,
    "已调整标题层级。",
  );
});
