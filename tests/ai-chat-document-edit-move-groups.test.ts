import assert from "node:assert/strict";
import { test } from "node:test";
import { Schema } from "@tiptap/pm/model";
import { getContiguousMoveOperationGroups } from "../src/features/editor/lib/ai-chat-document-edit-move-groups";
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

test("groups pairwise adjacent move operations as one contiguous range move", () => {
  const blocks = [
    paragraphBlock("block_1", "A", 0),
    paragraphBlock("block_2", "B", 3),
    paragraphBlock("block_3", "C", 6),
    paragraphBlock("block_4", "D", 9),
  ];

  const groups = getContiguousMoveOperationGroups(
    [
      {
        blockId: "block_3",
        placement: "before",
        targetBlockId: "block_1",
        type: "move_block",
      },
      {
        blockId: "block_4",
        placement: "before",
        targetBlockId: "block_2",
        type: "move_block",
      },
    ],
    blocks,
  );

  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0]?.operationIndexes, [0, 1]);
  assert.equal(groups[0]?.sourceStartBlock.id, "block_3");
  assert.equal(groups[0]?.sourceEndBlock.id, "block_4");
  assert.equal(groups[0]?.targetStartBlock.id, "block_1");
  assert.equal(groups[0]?.targetEndBlock.id, "block_2");
});

function paragraphBlock(id: string, text: string, pos: number): LocalAiDocumentBlock {
  const node = schema.nodes.paragraph.create(null, schema.text(text));

  return {
    id,
    node,
    nodeSize: node.nodeSize,
    pos,
    text,
    type: "paragraph",
  };
}
