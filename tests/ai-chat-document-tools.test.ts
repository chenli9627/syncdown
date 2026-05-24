import assert from "node:assert/strict";
import { test } from "node:test";
import { getAiDocumentEditToolSummary } from "../src/features/editor/lib/ai-chat-document-tools";

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
