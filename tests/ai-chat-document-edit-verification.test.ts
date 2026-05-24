import assert from "node:assert/strict";
import { test } from "node:test";
import { Schema } from "@tiptap/pm/model";
import { verifyAiDocumentEditOperations } from "../src/features/editor/lib/ai-chat-document-edit-verification";
import type { LocalAiDocumentBlock } from "../src/features/editor/lib/ai-chat-document-edit-types";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    heading: {
      attrs: { level: { default: 1 } },
      content: "text*",
      group: "block",
      parseDOM: [{ tag: "h1", attrs: { level: 1 } }],
      toDOM: (node) => [`h${node.attrs.level}`, 0],
    },
    paragraph: {
      content: "text*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", 0],
    },
    text: { group: "inline" },
  },
  marks: {
    bold: {
      parseDOM: [{ tag: "strong" }],
      toDOM: () => ["strong", 0],
    },
    link: {
      attrs: { href: {} },
      parseDOM: [{ tag: "a[href]", getAttrs: (dom) => ({ href: dom.getAttribute("href") }) }],
      toDOM: (mark) => ["a", { href: mark.attrs.href }, 0],
    },
  },
});

test("verifies text replacement results", () => {
  const result = verifyAiDocumentEditOperations(
    [
      {
        blockId: "block_1",
        replacementText: "Beta",
        targetText: "Alpha",
        type: "replace_text_in_block",
      },
    ],
    [paragraphBlock("block_1", "Alpha", 0)],
    [paragraphBlock("block_1", "Beta", 0)],
  );

  assert.equal(result.verified, true);
  assert.equal(result.failedCount, 0);
});

test("rejects text replacement results that did not reach the target state", () => {
  const result = verifyAiDocumentEditOperations(
    [
      {
        blockId: "block_1",
        replacementText: "Beta",
        targetText: "Alpha",
        type: "replace_text_in_block",
      },
    ],
    [paragraphBlock("block_1", "Alpha", 0)],
    [paragraphBlock("block_1", "Alpha", 0)],
  );

  assert.equal(result.verified, false);
  assert.equal(result.failedCount, 1);
});

test("verifies heading level and text mark results", () => {
  const result = verifyAiDocumentEditOperations(
    [
      { blockId: "block_1", level: 3, type: "set_heading_level" },
      { blockId: "block_2", marks: ["bold"], targetText: "北京", type: "set_text_marks" },
    ],
    [headingBlock("block_1", "Roadmap", 0, 2), paragraphBlock("block_2", "北京", 12)],
    [
      headingBlock("block_1", "Roadmap", 0, 3),
      paragraphBlock("block_2", "北京", 12, ["bold"]),
    ],
  );

  assert.equal(result.verified, true);
});

test("rejects deleted blocks that still exist at the original position", () => {
  const result = verifyAiDocumentEditOperations(
    [{ blockId: "block_1", type: "delete_block" }],
    [paragraphBlock("block_1", "Keep me", 0)],
    [paragraphBlock("block_1", "Keep me", 0)],
  );

  assert.equal(result.verified, false);
  assert.equal(result.failedCount, 1);
});

function paragraphBlock(
  id: string,
  text: string,
  pos: number,
  marks: string[] = [],
): LocalAiDocumentBlock {
  const markInstances = marks.map((mark) => schema.marks[mark].create());
  const node = schema.nodes.paragraph.create(
    null,
    text ? schema.text(text, markInstances) : undefined,
  );

  return {
    id,
    node,
    nodeSize: node.nodeSize,
    pos,
    text,
    type: "paragraph",
  };
}

function headingBlock(
  id: string,
  text: string,
  pos: number,
  level: number,
): LocalAiDocumentBlock {
  const node = schema.nodes.heading.create({ level }, text ? schema.text(text) : undefined);

  return {
    id,
    level,
    node,
    nodeSize: node.nodeSize,
    pos,
    text,
    type: "heading",
  };
}
