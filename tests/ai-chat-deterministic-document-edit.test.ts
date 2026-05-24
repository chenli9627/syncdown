import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiChatDocumentBlock } from "../src/features/app-state/types";
import { buildDeterministicAiDocumentEditPayload } from "../src/features/editor/lib/ai-chat-deterministic-document-edit";

const documentBlocks: AiChatDocumentBlock[] = [
  { id: "block_1", level: 1, text: "北京旅行计划", type: "heading" },
  {
    id: "block_2",
    markdown: "- 故宫\n- 天坛\n- 颐和园",
    text: "故宫天坛颐和园",
    type: "bulletList",
  },
  {
    id: "block_3",
    markdown: "- 烤鸭\n- 炸酱面",
    text: "烤鸭炸酱面",
    type: "bulletList",
  },
  {
    html: "<table><tr><th>日期</th><th>地点</th><th>备注</th></tr><tr><td>Day 1</td><td>故宫</td><td>提前预约</td></tr><tr><td>Day 2</td><td>天坛</td><td>早点出发</td></tr></table>",
    id: "block_4",
    text: "日期地点备注Day 1故宫提前预约Day 2天坛早点出发",
    type: "table",
  },
  {
    id: "block_5",
    markdown: "- [ ] 订酒店\n- [x] 买车票",
    text: "订酒店买车票",
    type: "taskList",
  },
  {
    html: "<p>官网：<a href=\"https://example.com\">北京文旅</a></p>",
    id: "block_6",
    text: "官网：北京文旅",
    type: "paragraph",
  },
  {
    id: "block_7",
    level: 2,
    markdown: "## 景点",
    text: "景点",
    type: "heading",
  },
  {
    id: "block_8",
    text: "北京是一座历史与现代交融的城市。北京有很多值得去的地方。",
    type: "paragraph",
  },
];

test("builds deterministic exact text replacement operations", () => {
  assert.deepEqual(buildDeterministicAiDocumentEditPayload("把烤鸭改成北京烤鸭。", documentBlocks), {
    operations: [
      {
        blockId: "block_3",
        replacementText: "北京烤鸭",
        targetText: "烤鸭",
        type: "replace_text_in_block",
      },
    ],
    summary: "已将“烤鸭”改为“北京烤鸭”。",
  });
});

test("builds deterministic table cell update operations", () => {
  assert.deepEqual(
    buildDeterministicAiDocumentEditPayload("把 Day 2 的备注改成午后出发。", documentBlocks),
    {
      operations: [
        {
          blockId: "block_4",
          column: 3,
          content: "午后出发",
          row: 3,
          type: "update_table_cell",
        },
      ],
      summary: "已更新表格中“Day 2”这一行的“备注”单元格。",
    },
  );
});

test("builds deterministic task checkbox operations", () => {
  assert.deepEqual(
    buildDeterministicAiDocumentEditPayload("勾选任务里的订酒店。", documentBlocks),
    {
      operations: [
        {
          blockId: "block_5",
          checked: true,
          targetText: "订酒店",
          type: "set_task_item_checked",
        },
      ],
      summary: "已勾选任务“订酒店”。",
    },
  );
});

test("builds deterministic task checkbox operations for multiple targets", () => {
  assert.deepEqual(
    buildDeterministicAiDocumentEditPayload("取消勾选“买车票”，并勾选“订酒店”。", documentBlocks),
    {
      operations: [
        {
          blockId: "block_5",
          checked: false,
          targetText: "买车票",
          type: "set_task_item_checked",
        },
        {
          blockId: "block_5",
          checked: true,
          targetText: "订酒店",
          type: "set_task_item_checked",
        },
      ],
      summary: "已取消勾选任务“买车票”；已勾选任务“订酒店”。",
    },
  );
});

test("builds deterministic heading level operations", () => {
  assert.deepEqual(
    buildDeterministicAiDocumentEditPayload("把景点改成三级标题。", documentBlocks),
    {
      operations: [{ blockId: "block_7", level: 3, type: "set_heading_level" }],
      summary: "已将“景点”调整为 3 级标题。",
    },
  );
});

test("builds deterministic heading level operations for multiple headings", () => {
  assert.deepEqual(
    buildDeterministicAiDocumentEditPayload("把北京旅行计划和景点都改成三级标题。", documentBlocks),
    {
      operations: [
        { blockId: "block_1", level: 3, type: "set_heading_level" },
        { blockId: "block_7", level: 3, type: "set_heading_level" },
      ],
      summary: "已将“北京旅行计划”、“景点”调整为 3 级标题。",
    },
  );
});

test("builds deterministic text mark operations", () => {
  assert.deepEqual(
    buildDeterministicAiDocumentEditPayload("把所有北京都加粗。", documentBlocks),
    {
      operations: [
        {
          blockId: "block_1",
          marks: ["bold"],
          targetText: "北京",
          type: "set_text_marks",
        },
        {
          blockId: "block_6",
          marks: ["bold"],
          targetText: "北京",
          type: "set_text_marks",
        },
        {
          blockId: "block_8",
          marks: ["bold"],
          targetText: "北京",
          type: "set_text_marks",
        },
      ],
      summary: "已将“北京”设为粗体。",
    },
  );
});

test("builds deterministic link operations", () => {
  assert.deepEqual(
    buildDeterministicAiDocumentEditPayload(
      "给北京文旅加上链接 https://visitbeijing.com.cn",
      documentBlocks,
    ),
    {
      operations: [
        {
          blockId: "block_6",
          href: "https://visitbeijing.com.cn",
          targetText: "北京文旅",
          type: "set_link",
        },
      ],
      summary: "已更新“北京文旅”的链接。",
    },
  );
});

test("builds deterministic link operations for raw domains and link address phrasing", () => {
  assert.deepEqual(
    buildDeterministicAiDocumentEditPayload(
      "把北京文旅的链接地址改成 google.com",
      documentBlocks,
    ),
    {
      operations: [
        {
          blockId: "block_6",
          href: "google.com",
          targetText: "北京文旅",
          type: "set_link",
        },
      ],
      summary: "已更新“北京文旅”的链接。",
    },
  );
});
