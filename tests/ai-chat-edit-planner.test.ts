import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiChatDocumentBlock } from "../src/features/app-state/types";
import { planAiChatEdit } from "../src/features/editor/lib/ai-chat-edit-planner";

const documentBlocks: AiChatDocumentBlock[] = [
  { id: "block_1", level: 1, text: "北京旅行计划", type: "heading" },
  { id: "block_2", level: 2, text: "景点", type: "heading" },
  { id: "block_3", text: "北京是一座历史与现代交融的城市。", type: "paragraph" },
];

test("plans deterministic edits when a local payload exists", () => {
  const plan = planAiChatEdit({
    documentBlocks,
    prompt: "把标题都缩小一个等级",
    responseMode: null,
  });

  assert.equal(plan.kind, "deterministic_edit");
  assert.equal(plan.documentAction, "edit_blocks");
  assert.match(plan.payloadText, /set_heading_level/);
});

test("plans llm edits when the edit is supported but not deterministic", () => {
  assert.deepEqual(
    planAiChatEdit({
      documentBlocks,
      prompt: "把刚才的列表插入到文档末尾",
      responseMode: null,
    }),
    {
      documentAction: "edit_blocks",
      kind: "llm_edit",
      responseMode: null,
    },
  );
});
