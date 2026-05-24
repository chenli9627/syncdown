import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getAiDocumentEditToolOperationCount,
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
