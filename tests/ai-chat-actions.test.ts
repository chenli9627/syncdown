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

test("does not infer document actions for ordinary chat prompts", () => {
  assert.equal(inferAiChatDocumentAction("解释一下这篇文档"), null);
  assert.equal(inferAiChatDocumentAction("What are the differences between these models?"), null);
});
