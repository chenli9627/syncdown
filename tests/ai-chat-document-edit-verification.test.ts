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

test("verifies text replacements when the replacement still contains the target text", () => {
  const result = verifyAiDocumentEditOperations(
    [
      {
        blockId: "block_1",
        replacementText: "北京烤鸭",
        targetText: "烤鸭",
        type: "replace_text_in_block",
      },
    ],
    [paragraphBlock("block_1", "烤鸭", 0)],
    [paragraphBlock("block_1", "北京烤鸭", 0)],
  );

  assert.equal(result.verified, true);
  assert.equal(result.failedCount, 0);
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

test("verifies inserted markdown content without adding artificial inline spaces", () => {
  const result = verifyAiDocumentEditOperations(
    [
      {
        blockId: "block_1",
        content: "**总结：**北京市是中华人民共和国的首都。",
        type: "insert_after_block",
      },
    ],
    [paragraphBlock("block_1", "原文", 0)],
    [
      paragraphBlock("block_1", "原文", 0),
      paragraphBlock("block_2", "总结：北京市是中华人民共和国的首都。", 4),
    ],
  );

  assert.equal(result.verified, true);
  assert.equal(result.failedCount, 0);
});

test("verifies inserted markdown content split across multiple blocks", () => {
  const result = verifyAiDocumentEditOperations(
    [
      {
        blockId: "block_1",
        content: "**总结：**北京市是中华人民共和国的首都。\n\n**English Summary:** Beijing is the capital of China.",
        type: "insert_after_block",
      },
    ],
    [paragraphBlock("block_1", "原文", 0)],
    [
      paragraphBlock("block_1", "原文", 0),
      paragraphBlock("block_2", "总结：北京市是中华人民共和国的首都。", 4),
      paragraphBlock("block_3", "English Summary: Beijing is the capital of China.", 22),
    ],
  );

  assert.equal(result.verified, true);
  assert.equal(result.failedCount, 0);
});

test("verifies long inserted markdown blocks by stable excerpts", () => {
  const longChineseSummary =
    "总结：北京市是中华人民共和国的首都及直辖市，简称\"京\"，旧称\"北平\"，拥有三千余年建城史和八百六十余年建都史，辽、金、元、明、清五朝曾在此定都。";
  const longEnglishSummary =
    "Summary: Beijing, abbreviated as \"Jing\" and formerly known as Beiping, is the capital and a direct-administered municipality of the People's Republic of China.";

  const result = verifyAiDocumentEditOperations(
    [
      {
        blockId: "block_1",
        content: `**${longChineseSummary.slice(0, 3)}**${longChineseSummary.slice(3)}\n\n**Summary:**${longEnglishSummary.slice("Summary:".length)}`,
        type: "insert_after_block",
      },
    ],
    [paragraphBlock("block_1", "原文", 0)],
    [
      paragraphBlock("block_1", "原文", 0),
      paragraphBlock("block_2", longChineseSummary, 4),
      paragraphBlock("block_3", longEnglishSummary, 160),
    ],
  );

  assert.equal(result.verified, true);
  assert.equal(result.failedCount, 0);
});

test("verifies inserted markdown tables by compact cell text", () => {
  const result = verifyAiDocumentEditOperations(
    [
      {
        blockId: "block_1",
        content:
          '| 序号 | 新闻名 |\n|:---:|:---|\n| 1 | ["时刻绷紧安全生产这根弦"](https://top.baidu.com/board?tab=realtime) |',
        type: "insert_after_block",
      },
    ],
    [paragraphBlock("block_1", "原文", 0)],
    [
      paragraphBlock("block_1", "原文", 0),
      paragraphBlock("block_2", "序号新闻名1时刻绷紧安全生产这根弦", 4),
    ],
  );

  assert.equal(result.verified, true);
  assert.equal(result.failedCount, 0);
});

test("verifies moved blocks by their new relative position", () => {
  const result = verifyAiDocumentEditOperations(
    [
      {
        blockId: "block_3",
        placement: "before",
        targetBlockId: "block_1",
        type: "move_block",
      },
    ],
    [
      paragraphBlock("block_1", "中文总结", 0),
      paragraphBlock("block_2", "中文内容", 6),
      paragraphBlock("block_3", "English Summary", 12),
    ],
    [
      paragraphBlock("block_1", "English Summary", 0),
      paragraphBlock("block_2", "中文总结", 18),
      paragraphBlock("block_3", "中文内容", 24),
    ],
  );

  assert.equal(result.verified, true);
  assert.equal(result.failedCount, 0);
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
