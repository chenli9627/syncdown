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

test("plans deterministic edits from previous assistant content when available", () => {
  const plan = planAiChatEdit({
    documentBlocks,
    messages: [
      {
        id: "msg_user",
        metadata: { createdAt: new Date().toISOString() },
        parts: [{ text: "介绍一下杭州", type: "text" }],
        role: "user",
      },
      {
        id: "msg_assistant",
        metadata: { createdAt: new Date().toISOString() },
        parts: [{ text: "- 西湖\n- 灵隐寺", type: "text" }],
        role: "assistant",
      },
    ],
    prompt: "把刚才的列表插入到文档末尾",
    responseMode: null,
  });

  assert.equal(plan.kind, "deterministic_edit");
  assert.match(plan.payloadText, /insert_after_block/);
  assert.match(plan.payloadText, /西湖/);
});

test("does not reuse previous assistant content for unrelated structural edit prompts", () => {
  const plan = planAiChatEdit({
    documentBlocks,
    messages: [
      {
        id: "msg_user",
        metadata: { createdAt: new Date().toISOString() },
        parts: [{ text: "介绍一下杭州", type: "text" }],
        role: "user",
      },
      {
        id: "msg_assistant",
        metadata: { createdAt: new Date().toISOString() },
        parts: [{ text: "- 西湖\n- 灵隐寺", type: "text" }],
        role: "assistant",
      },
    ],
    prompt: "给每一段加上二级标题",
    responseMode: null,
  });

  assert.equal(plan.kind, "llm_edit");
});
