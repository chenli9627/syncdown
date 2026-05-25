import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldRequestDocumentActionConfirmation } from "../src/features/editor/hooks/use-ai-chat-auto-document-action";
import { parseAiDocumentEditPlan } from "../src/features/editor/lib/ai-chat-document-edit-plan";

test("does not request confirmation for edit-block responses without operations", () => {
  assert.equal(
    shouldRequestDocumentActionConfirmation(
      "edit_blocks",
      parseAiDocumentEditPlan(
        JSON.stringify({
          operations: [],
          summary: "模型没有返回可应用的文档操作，未修改文档。",
        }),
      ),
    ),
    false,
  );
});

test("requests confirmation for edit-block responses with operations", () => {
  assert.equal(
    shouldRequestDocumentActionConfirmation(
      "edit_blocks",
      parseAiDocumentEditPlan(
        JSON.stringify({
          operations: [{ blockId: "block_1", level: 2, type: "set_heading_level" }],
          summary: "已调整标题层级。",
        }),
      ),
    ),
    true,
  );
});

test("does not request confirmation for legacy non-block document actions", () => {
  assert.equal(shouldRequestDocumentActionConfirmation("insert_end", null), false);
  assert.equal(shouldRequestDocumentActionConfirmation("replace_selection", null), false);
});
