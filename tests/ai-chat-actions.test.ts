import assert from "node:assert/strict";
import { test } from "node:test";
import { inferAiChatDocumentAction } from "../src/features/editor/lib/ai-chat-actions";

test("infers insert-end action from Chinese document placement requests", () => {
  assert.equal(
    inferAiChatDocumentAction(
      "给我一个 deepseek-v4-flash 和 deepseek-v4-pro 区别的表格，放到文档末尾",
    ),
    "insert_end",
  );
  assert.equal(inferAiChatDocumentAction("将总结放入文档末尾并添加标题"), "insert_end");
  assert.equal(inferAiChatDocumentAction("把总结追加到最后"), "insert_end");
});

test("infers insert-end action from English document placement requests", () => {
  assert.equal(
    inferAiChatDocumentAction("Make a comparison table and append it to the end of the document"),
    "insert_end",
  );
  assert.equal(inferAiChatDocumentAction("Please add this at the document bottom"), "insert_end");
});

test("infers insert-cursor action from cursor placement requests", () => {
  assert.equal(inferAiChatDocumentAction("生成一句摘要，插入到光标处"), "insert_cursor");
  assert.equal(inferAiChatDocumentAction("把下面这句话加到当前位置"), "insert_cursor");
  assert.equal(inferAiChatDocumentAction("Insert a short summary at the cursor"), "insert_cursor");
});

test("infers replace-selection action from selected text edit requests", () => {
  assert.equal(inferAiChatDocumentAction("把选中的内容改写得更正式"), "replace_selection");
  assert.equal(inferAiChatDocumentAction("润色当前选区"), "replace_selection");
  assert.equal(inferAiChatDocumentAction("Translate the selected text to English"), "replace_selection");
});

test("infers replace-selection action from broad edit prompts when text is selected", () => {
  assert.equal(
    inferAiChatDocumentAction("改得更正式一点", { hasSelection: true }),
    "replace_selection",
  );
  assert.equal(
    inferAiChatDocumentAction("Translate this to English", { hasSelection: true }),
    "replace_selection",
  );
});

test("infers replace-document action from whole document edit requests", () => {
  assert.equal(inferAiChatDocumentAction("把当前文档整理成会议纪要"), "replace_document");
  assert.equal(inferAiChatDocumentAction("删除这篇文档里重复的内容"), "replace_document");
  assert.equal(inferAiChatDocumentAction("Rewrite this document in a more formal tone"), "replace_document");
});

test("infers block-edit action from special placement requests", () => {
  assert.equal(inferAiChatDocumentAction("生成一个风险表格，放到方案下面"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("在第二段之前插入一个摘要"), "edit_blocks");
  assert.equal(
    inferAiChatDocumentAction("Create a comparison table under the Background section"),
    "edit_blocks",
  );
});

test("infers block-edit action from targeted block edit requests", () => {
  assert.equal(inferAiChatDocumentAction("删除包含“临时风险：Gamma。”的段落"), "edit_blocks");
  assert.equal(
    inferAiChatDocumentAction("把包含“当前方案：Beta。”的段落改成“当前方案：Beta 已升级。”"),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("把列表项目里的 Gamma 改成 Gamma-1，保留列表格式。"),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("把粗体里的 Alpha 改成 Alpha-1，保留粗体格式。"),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("把删除线里的 Alpha 改成 Alpha-1，保留删除线格式。"),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("把链接里的 Alpha 改成 Alpha-1，保留链接。"),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("把原文里的表格改成三列表格，保留原来的数据。"),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("修改当前段落，语气更正式。"),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("Update the original table to include sources"),
    "edit_blocks",
  );
  assert.equal(inferAiChatDocumentAction("Delete the paragraph containing Gamma"), "edit_blocks");
});

test("does not infer document actions for ordinary chat prompts", () => {
  assert.equal(inferAiChatDocumentAction("解释一下这篇文档"), null);
  assert.equal(inferAiChatDocumentAction("What are the differences between these models?"), null);
  assert.equal(inferAiChatDocumentAction("把标题改成项目计划"), null);
});

test("does not infer document actions from negative edit instructions", () => {
  assert.equal(inferAiChatDocumentAction("只回答当前文档包含哪些部分，不要修改文档。"), null);
  assert.equal(inferAiChatDocumentAction("总结一下当前内容，不改动文档"), null);
  assert.equal(inferAiChatDocumentAction("Only answer what sections exist. Do not edit the document."), null);
});

test("keeps whole-document edits as replace-document actions", () => {
  assert.equal(inferAiChatDocumentAction("Update the current document in a formal tone"), "replace_document");
});
