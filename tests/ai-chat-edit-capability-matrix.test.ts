import assert from "node:assert/strict";
import { test } from "node:test";
import { inferAiChatDocumentAction } from "../src/features/editor/lib/ai-chat-actions";

const editBlockPrompts = [
  ["delete paragraph", "删除包含“临时风险”的段落"],
  ["delete table", "删除这个表格"],
  ["delete implicit target", "删掉这个东西"],
  ["delete references", "去掉这些引用标注"],
  ["replace all text", "把所有 Alpha 替换成 Beta"],
  ["bold every occurrence", "把所有的北京都加粗"],
  ["italic target text", "把 Alpha 设为斜体"],
  ["strike target text", "给过时两个字加删除线"],
  ["set link", "给官网两个字加上链接"],
  ["heading level", "把第二个标题改成三级标题"],
  ["block type", "把当前段落改成代码块"],
  ["list type", "把第二个列表转成任务列表"],
  ["task checkbox", "勾选包含发布的任务项"],
  ["table cell", "把表格第二行第三列改成 Done"],
  ["table row", "给表格新增一行"],
  ["table column", "给表格新增一列"],
  ["move block", "把风险表格移动到方案下面"],
  ["insert near heading", "在背景下面插入一个摘要"],
  ["add subheadings", "给文档添加小标题"],
  ["add subheadings with compact wording", "把文档加上小标题"],
  ["add section headings", "Add section headings to this document"],
] as const;

test("AI chat routes supported current-document edits to block operations", () => {
  editBlockPrompts.forEach(([label, prompt]) => {
    assert.equal(inferAiChatDocumentAction(prompt), "edit_blocks", label);
  });
});

test("AI chat keeps broad selected-text edits scoped to the selection", () => {
  assert.equal(
    inferAiChatDocumentAction("改得更正式一点", { hasSelection: true }),
    "replace_selection",
  );
  assert.equal(
    inferAiChatDocumentAction("Translate this to English", { hasSelection: true }),
    "replace_selection",
  );
});

test("AI chat keeps explicit whole-document rewrites as document replacement", () => {
  assert.equal(inferAiChatDocumentAction("把当前文档整理成会议纪要"), "replace_document");
  assert.equal(
    inferAiChatDocumentAction("Rewrite this document in a more formal tone"),
    "replace_document",
  );
});

test("AI chat does not edit when the user explicitly asks not to edit", () => {
  assert.equal(inferAiChatDocumentAction("只回答当前文档包含哪些部分，不要修改文档。"), null);
  assert.equal(
    inferAiChatDocumentAction("Only answer what sections exist. Do not edit the document."),
    null,
  );
});
