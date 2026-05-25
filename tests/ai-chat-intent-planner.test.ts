import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiChatDocumentBlock } from "../src/features/app-state/types";
import { planAiChatIntent } from "../src/features/editor/lib/ai-chat-intent-planner";

const documentBlocks: AiChatDocumentBlock[] = [
  { id: "block_1", level: 1, text: "北京旅行计划", type: "heading" },
  { id: "block_2", level: 2, text: "景点", type: "heading" },
  {
    id: "block_3",
    text: "北京是一座历史与现代交融的城市。",
    type: "paragraph",
  },
];

test("plans ordinary requests as chat", () => {
  assert.deepEqual(planAiChatIntent("翻译一下这句话", {}), {
    documentAction: null,
    kind: "chat",
    responseMode: null,
  });
});

test("plans explicit document edits as edit", () => {
  assert.deepEqual(
    planAiChatIntent("把标题都缩小一个等级", {
      documentBlocks,
      documentText: "北京旅行计划\n景点\n北京是一座历史与现代交融的城市。",
    }),
    {
      documentAction: "edit_blocks",
      kind: "edit",
      responseMode: null,
    },
  );
});

test("plans ambiguous edit-like requests as clarify", () => {
  const plan = planAiChatIntent("帮我调整一下结构", {
    documentBlocks,
    documentText: "北京旅行计划\n景点\n北京是一座历史与现代交融的城市。",
  });

  assert.equal(plan.kind, "clarify");
  assert.equal(plan.clarification.kind, "ambiguous_edit_intent");
});

test("plans whole-document rewrite requests as unsupported", () => {
  assert.deepEqual(
    planAiChatIntent("把当前文档整理成会议纪要", {
      documentBlocks,
      documentText: "北京旅行计划\n景点\n北京是一座历史与现代交融的城市。",
    }),
    {
      kind: "unsupported",
      reason: "whole_document_rewrite",
    },
  );
});

test("plans manual undo requests as unsupported manual undo", () => {
  assert.deepEqual(planAiChatIntent("撤回上一个操作"), {
    kind: "unsupported",
    reason: "manual_undo",
  });
});

test("keeps known clarification cases intact", () => {
  const plan = planAiChatIntent("把这个改一下", {
    documentBlocks,
    documentText: "北京旅行计划\n景点\n北京是一座历史与现代交融的城市。",
  });

  assert.equal(plan.kind, "clarify");
  assert.equal(plan.clarification.kind, "ambiguous_edit_intent");
});
