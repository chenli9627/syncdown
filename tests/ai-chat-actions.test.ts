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

test("does not infer document actions for ordinary chat prompts", () => {
  assert.equal(inferAiChatDocumentAction("解释一下这篇文档"), null);
  assert.equal(inferAiChatDocumentAction("What are the differences between these models?"), null);
});
