import assert from "node:assert/strict";
import { test } from "node:test";
import { Schema } from "@tiptap/pm/model";
import { toExecutableOperations } from "../src/features/editor/lib/ai-chat-document-edit-converter";
import type {
  AiDocumentEditOperation,
  LocalAiDocumentBlock,
} from "../src/features/editor/lib/ai-chat-document-edit-types";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    codeBlock: {
      content: "text*",
      group: "block",
      code: true,
      marks: "",
      parseDOM: [{ tag: "pre", preserveWhitespace: "full" }],
      toDOM: () => ["pre", ["code", 0]],
    },
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
  },
});

test("AI edit converter creates mark operations for every matching target in a block", () => {
  const block = paragraphBlock("block_1", "北京和北京，还有北京", 0);
  const operations = toExecutableOperations(
    {
      blockId: "block_1",
      marks: ["bold"],
      targetText: "北京",
      type: "set_text_marks",
    },
    [block],
    0,
  );

  assert.deepEqual(
    operations.map((operation) => ({
      marks: operation.marks,
      range: operation.range,
      type: operation.type,
    })),
    [
      { marks: ["bold"], range: { from: 1, to: 3 }, type: "set_text_marks" },
      { marks: ["bold"], range: { from: 4, to: 6 }, type: "set_text_marks" },
      { marks: ["bold"], range: { from: 9, to: 11 }, type: "set_text_marks" },
    ],
  );
});

test("AI edit converter creates replace operations for every matching target in every block", () => {
  const blocks = [
    paragraphBlock("block_1", "Alpha Alpha", 0),
    paragraphBlock("block_2", "Beta Alpha", 20),
  ];
  const operations = toExecutableOperations(
    {
      blockId: "block_1",
      replacementText: "Gamma",
      targetText: "Alpha",
      type: "replace_all_text",
    },
    blocks,
    0,
  );

  assert.deepEqual(
    operations.map((operation) => ({
      content: operation.content,
      range: operation.range,
      type: operation.type,
    })),
    [
      { content: "Gamma", range: { from: 1, to: 6 }, type: "replace_all_text" },
      { content: "Gamma", range: { from: 7, to: 12 }, type: "replace_all_text" },
      { content: "Gamma", range: { from: 26, to: 31 }, type: "replace_all_text" },
    ],
  );
});

test("AI edit converter replaces every matching target inside a code block", () => {
  const block = codeBlock("block_1", "const count = 1\nconsole.log(count)", 0);
  const operations = toExecutableOperations(
    {
      blockId: "block_1",
      replacementText: "total",
      targetText: "count",
      type: "replace_text_in_block",
    },
    [block],
    0,
  );

  assert.deepEqual(
    operations.map((operation) => ({
      content: operation.content,
      range: operation.range,
      type: operation.type,
    })),
    [
      { content: "total", range: { from: 7, to: 12 }, type: "replace_text_in_block" },
      { content: "total", range: { from: 29, to: 34 }, type: "replace_text_in_block" },
    ],
  );
});

test("AI edit converter supports heading level changes without replacing the block text", () => {
  const block = headingBlock("block_1", "Roadmap", 0, 2);
  const operations = toExecutableOperations(
    {
      blockId: "block_1",
      level: 3,
      type: "set_heading_level",
    },
    [block],
    0,
  );

  assert.equal(operations.length, 1);
  assert.equal(operations[0]?.type, "set_heading_level");
  assert.equal(operations[0]?.level, 3);
  assert.deepEqual(operations[0]?.range, { from: 0, to: block.nodeSize });
});

test("AI edit converter rejects operations against missing blocks", () => {
  const operation: AiDocumentEditOperation = {
    blockId: "missing",
    targetText: "Alpha",
    type: "set_text_marks",
    marks: ["bold"],
  };

  assert.deepEqual(toExecutableOperations(operation, [paragraphBlock("block_1", "Alpha", 0)], 0), []);
});

function paragraphBlock(id: string, text: string, pos: number): LocalAiDocumentBlock {
  const node = schema.nodes.paragraph.create(null, text ? schema.text(text) : undefined);

  return {
    id,
    node,
    nodeSize: node.nodeSize,
    pos,
    text,
    type: "paragraph",
  };
}

function codeBlock(id: string, text: string, pos: number): LocalAiDocumentBlock {
  const node = schema.nodes.codeBlock.create(null, text ? schema.text(text) : undefined);

  return {
    id,
    node,
    nodeSize: node.nodeSize,
    pos,
    text,
    type: "codeBlock",
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
