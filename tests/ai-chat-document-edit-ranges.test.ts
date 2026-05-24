import assert from "node:assert/strict";
import { test } from "node:test";
import { Schema } from "@tiptap/pm/model";
import { findTargetTextRanges } from "../src/features/editor/lib/ai-chat-document-edit-ranges";
import type { LocalAiDocumentBlock } from "../src/features/editor/lib/ai-chat-document-edit-types";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      content: "text*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", 0],
    },
    text: { group: "inline" },
  },
});

test("findTargetTextRanges finds every matching text range in a block", () => {
  const text = "北京和北京，还有北京";
  const node = schema.nodes.paragraph.create(null, schema.text(text));
  const block: LocalAiDocumentBlock = {
    id: "block_1",
    node,
    nodeSize: node.nodeSize,
    pos: 0,
    text,
    type: "paragraph",
  };

  assert.deepEqual(findTargetTextRanges(block, "北京"), [
    { from: 1, to: 3 },
    { from: 4, to: 6 },
    { from: 9, to: 11 },
  ]);
});
