import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getAiDocumentEditToolOperationCount,
  getAiDocumentEditToolPreviewLines,
  getAiDocumentEditToolSummary,
} from "../src/features/editor/lib/ai-chat-document-tools";

test("reads AI document edit tool summaries from JSON", () => {
  assert.equal(
    getAiDocumentEditToolSummary(
      JSON.stringify({
        operations: [
          {
            blockId: "block_2",
            content: "Inserted text",
            type: "insert_after_block",
          },
        ],
        summary: "Inserted text after block 2.",
      }),
    ),
    "Inserted text after block 2.",
  );
});

test("ignores non-tool AI responses", () => {
  assert.equal(getAiDocumentEditToolSummary("普通回答"), null);
});

test("shows unsupported document edit summaries from empty operations", () => {
  assert.equal(
    getAiDocumentEditToolSummary(
      JSON.stringify({
        operations: [],
        summary: "I cannot do that edit yet.",
      }),
    ),
    "I cannot do that edit yet.",
  );
});

test("normalizes action-like summaries with empty operations into a non-applied fallback", () => {
  assert.equal(
    getAiDocumentEditToolSummary(
      JSON.stringify({
        operations: [],
        summary: "在每个段落前插入对应的三级标题。",
      }),
    ),
    "模型没有返回可应用的文档操作，未修改文档。",
  );
});

test("counts requested AI document edit operations", () => {
  assert.equal(
    getAiDocumentEditToolOperationCount(
      JSON.stringify({
        operations: [
          { blockId: "block_1", level: 5, type: "set_heading_level" },
          { blockId: "block_2", column: 2, type: "insert_table_column_after" },
        ],
      }),
    ),
    2,
  );
  assert.equal(getAiDocumentEditToolOperationCount("普通回答"), 0);
});

test("counts dependent table column header updates as one operation", () => {
  assert.equal(
    getAiDocumentEditToolOperationCount(
      JSON.stringify({
        operations: [
          { blockId: "block_2", column: 2, type: "insert_table_column_after" },
          { blockId: "block_2", column: 3, content: "Owner", row: 1, type: "update_table_cell" },
        ],
      }),
    ),
    1,
  );
});

test("builds preview lines for pending edit confirmation", () => {
  assert.deepEqual(
    getAiDocumentEditToolPreviewLines(
      JSON.stringify({
        operations: [
          { blockId: "block_1", content: "### 北京概况", type: "insert_after_block" },
          { blockId: "block_2", replacementText: "北京烤鸭", targetText: "烤鸭", type: "replace_text_in_block" },
        ],
      }),
    ),
    ["将插入到块后：### 北京概况", "将把“烤鸭”改成“北京烤鸭”"],
  );
});
