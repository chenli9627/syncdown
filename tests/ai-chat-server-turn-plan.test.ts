import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiChatDocumentBlock, AiChatMessage } from "../src/features/app-state/types";
import { planAiChatServerTurn } from "../src/features/editor/lib/ai-chat-server-turn-plan";

const documentBlocks: AiChatDocumentBlock[] = [
  { id: "block_1", level: 1, text: "北京旅行计划", type: "heading" },
  { id: "block_2", level: 2, text: "景点", type: "heading" },
  { id: "block_3", text: "北京是一座历史与现代交融的城市。", type: "paragraph" },
];

test("plans unsupported server turns without delegating to the model", () => {
  const plan = planAiChatServerTurn({
    documentBlocks,
    documentText: "北京旅行计划\n景点\n北京是一座历史与现代交融的城市。",
    prompt: "撤回上一个操作",
  });

  assert.equal(plan.kind, "unsupported");
  assert.match(plan.text, /Ctrl\+Z/u);
});

test("plans clarification server turns without delegating to the model", () => {
  const plan = planAiChatServerTurn({
    documentBlocks,
    documentText: "北京旅行计划\n景点\n北京是一座历史与现代交融的城市。",
    prompt: "帮我调整一下结构",
  });

  assert.equal(plan.kind, "clarify");
  assert.equal(plan.clarificationKind, "ambiguous_edit_intent");
});

test("plans deterministic edit turns when a local payload can be built", () => {
  const plan = planAiChatServerTurn({
    documentBlocks,
    documentText: "北京旅行计划\n景点\n北京是一座历史与现代交融的城市。",
    prompt: "把标题都缩小一个等级",
  });

  assert.equal(plan.kind, "deterministic_edit");
  assert.equal(plan.documentAction, "edit_blocks");
  assert.match(plan.payloadText, /set_heading_level/);
});

test("plans llm turns for ordinary chat prompts", () => {
  const plan = planAiChatServerTurn({
    documentBlocks,
    documentText: "北京旅行计划\n景点\n北京是一座历史与现代交融的城市。",
    prompt: "翻译一下这句话",
  });

  assert.deepEqual(plan, {
    documentAction: null,
    kind: "llm",
    responseMode: null,
  });
});

test("plans llm edit turns when the edit is supported but not deterministic", () => {
  const messages: AiChatMessage[] = [
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
  ];
  const plan = planAiChatServerTurn({
    documentBlocks,
    documentText: "北京旅行计划\n景点\n北京是一座历史与现代交融的城市。",
    messages,
    prompt: "把刚才的列表插入到文档末尾",
  });

  assert.deepEqual(plan, {
    documentAction: "edit_blocks",
    kind: "llm",
    responseMode: null,
  });
});
