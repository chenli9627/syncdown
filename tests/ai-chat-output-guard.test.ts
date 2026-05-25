import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiChatDocumentBlock } from "../src/features/app-state/types";
import {
  containsPseudoToolCallText,
  sanitizeAiAssistantText,
} from "../src/features/editor/lib/ai-chat-output-guard";
import { getInvalidEditBlocksFallback } from "../src/lib/server/ai-output-guard";

test("detects model-emitted pseudo tool call markup", () => {
  assert.equal(
    containsPseudoToolCallText(
      '<｜｜DSML｜｜tool_calls> <｜｜DSML｜｜invoke name="fetch_url">',
    ),
    true,
  );
});

test("sanitizes pseudo tool calls into an edit-block JSON fallback", () => {
  assert.equal(
    sanitizeAiAssistantText(
      '<｜｜DSML｜｜tool_calls> <｜｜DSML｜｜invoke name="fetch_url">',
      "edit_blocks",
    ),
    '{"summary":"模型返回了内部工具调用格式，未修改文档。","operations":[]}',
  );
});

test("leaves ordinary assistant text unchanged", () => {
  assert.equal(sanitizeAiAssistantText("普通回答", null), "普通回答");
});

test("strips transform preambles before list-format chat answers", () => {
  assert.equal(
    sanitizeAiAssistantText(
      "好的，将上面的杭州介绍整理为列表形式：\n- 西湖\n- 灵隐寺",
      null,
      "list",
    ),
    "- 西湖\n- 灵隐寺",
  );
});

test("normalizes colon lines into a markdown list for list-format chat answers", () => {
  assert.equal(
    sanitizeAiAssistantText(
      "城市定位：浙江省省会\n地理位置：中国东部\n核心景点：西湖",
      null,
      "list",
    ),
    "- 城市定位：浙江省省会\n- 地理位置：中国东部\n- 核心景点：西湖",
  );
});

test("strips transform preambles before table-format chat answers", () => {
  assert.equal(
    sanitizeAiAssistantText(
      "Below is the Markdown table:\n| 景点 | 说明 |\n| --- | --- |\n| 西湖 | 世界遗产 |",
      null,
      "table",
    ),
    "| 景点 | 说明 |\n| --- | --- |\n| 西湖 | 世界遗产 |",
  );
});

test("leaves valid edit-block JSON unchanged even when a response mode is present", () => {
  const payload =
    '{"summary":"已在文档末尾插入列表。","operations":[{"type":"insert_after_block","blockId":"block_1","content":"- 西湖\\n- 灵隐寺"}]}';

  assert.equal(sanitizeAiAssistantText(payload, "edit_blocks", "list"), payload);
});

test("strips inserted-content preambles before document-end insertion", () => {
  assert.equal(
    sanitizeAiAssistantText(
      "好的，已将整理后的列表内容插入到文档末尾。\n\n### 概况\n\n- 西湖",
      "insert_end",
    ),
    "### 概况\n\n- 西湖",
  );
});

test("strips single-line inserted-content preambles before document-end insertion", () => {
  assert.equal(
    sanitizeAiAssistantText("好的，已将内容插入到文档末尾。\n### 概况\n- 西湖", "insert_end"),
    "### 概况\n- 西湖",
  );
});

test("strips revised-text preambles before selection replacement", () => {
  assert.equal(
    sanitizeAiAssistantText(
      "Here is the revised text:\n\nA cleaner replacement paragraph.",
      "replace_selection",
    ),
    "A cleaner replacement paragraph.",
  );
});

test("keeps the preamble when there is no actual document content after it", () => {
  assert.equal(
    sanitizeAiAssistantText("好的，已将内容插入到文档末尾。", "insert_end"),
    "好的，已将内容插入到文档末尾。",
  );
});

test("strips trailing non-action boilerplate from ordinary chat answers", () => {
  assert.equal(
    sanitizeAiAssistantText(
      "这是杭州简介。\n\n由于当前对话未标记为自动文档操作，因此上述翻译未实际写入文档。如需将翻译添加到文档中，请重新发起文档编辑请求。",
      null,
    ),
    "这是杭州简介。",
  );
});

test("sanitizes invalid edit-block prose into an empty operation payload", () => {
  assert.equal(
    sanitizeAiAssistantText("很抱歉，接口返回 403，无法获取微博热搜。", "edit_blocks"),
    '{"summary":"无法获取可靠的实时网页数据，未修改文档。","operations":[]}',
  );
});

test("wraps insertable invalid edit-block prose when an insertion fallback is available", () => {
  assert.equal(
    sanitizeAiAssistantText(
      "好的，已将内容插入到文档末尾。\n\n### 总结\n\n北京是中国首都。",
      "edit_blocks",
      null,
      {
        blockId: "block_4",
        kind: "insert_after_block",
        summary: "在文档中插入了模型生成的内容。",
      },
    ),
    '{"summary":"在文档中插入了模型生成的内容。","operations":[{"blockId":"block_4","content":"### 总结\\n\\n北京是中国首都。","type":"insert_after_block"}]}',
  );
});

test("does not treat malformed edit payload json as insertable content fallback", () => {
  assert.equal(
    sanitizeAiAssistantText(
      '{"summary":"已将百度热搜榜前十名整理为表格并插入到文档末尾。","operations":[{"type":"insertafterblockmaybe","blockId":"block_10","content":"## 百度热搜榜"}]}',
      "edit_blocks",
      null,
      {
        blockId: "block_10",
        kind: "insert_after_block",
        summary: "在文档中插入了模型生成的内容。",
      },
    ),
    '{"summary":"模型没有返回可应用的文档操作，未修改文档。","operations":[]}',
  );
});

test("strips trailing edit payload fragments from insertable fallback content", () => {
  assert.equal(
    sanitizeAiAssistantText(
      '| 城市 | 天气 |\n| --- | --- |\n| 上海 | 小雨 |\n{"summary":"在文档末尾插入天气表。","operations":[{"type":"insertafterblock","blockId":"block_8","content":"## 今日全球城市天气对比\\n\\n',
      "edit_blocks",
      null,
      {
        blockId: "block_8",
        kind: "insert_after_block",
        summary: "在文档中插入了模型生成的内容。",
      },
    ),
    '{"summary":"在文档中插入了模型生成的内容。","operations":[{"blockId":"block_8","content":"| 城市 | 天气 |\\n| --- | --- |\\n| 上海 | 小雨 |","type":"insert_after_block"}]}',
  );
});

test("wraps invalid edit-block prose into a delete-table fallback", () => {
  assert.equal(
    sanitizeAiAssistantText(
      "未修改文档：模型没有返回可应用的文档操作，未修改文档。",
      "edit_blocks",
      null,
      {
        blockId: "block_table",
        kind: "delete_block",
        summary: "删除了文档中的表格。",
      },
    ),
    '{"summary":"删除了文档中的表格。","operations":[{"blockId":"block_table","type":"delete_block"}]}',
  );
});

test("detects current-summary replacement fallbacks on summary sections", () => {
  const documentBlocks: AiChatDocumentBlock[] = [
    { id: "block_1", level: 2, text: "总结", type: "heading" },
    { id: "block_2", text: "北京是中国的首都。", type: "paragraph" },
  ];

  assert.deepEqual(
    getInvalidEditBlocksFallback({
      documentAction: "edit_blocks",
      documentBlocks,
      prompt: "把总结加长一点，然后替换现在的总结。",
    }),
    {
      blockId: "block_2",
      kind: "replace_block",
      summary: "已更新当前总结。",
    },
  );
});

test("wraps rewritten summary prose into a replace-block fallback", () => {
  assert.equal(
    sanitizeAiAssistantText(
      "以下是加长后的总结：\n\n北京不仅是中国的首都，也是政治、文化、科技与国际交往中心，兼具深厚历史底蕴与现代城市活力。",
      "edit_blocks",
      null,
      {
        blockId: "block_summary",
        kind: "replace_block",
        summary: "已更新当前总结。",
      },
    ),
    '{"summary":"已更新当前总结。","operations":[{"blockId":"block_summary","content":"北京不仅是中国的首都，也是政治、文化、科技与国际交往中心，兼具深厚历史底蕴与现代城市活力。","type":"replace_block"}]}',
  );
});

test("detects current English translation replacement fallbacks", () => {
  const documentBlocks: AiChatDocumentBlock[] = [
    { id: "block_1", level: 2, text: "总结", type: "heading" },
    { id: "block_2", text: "北京是中国的首都，也是历史文化名城。", type: "paragraph" },
    {
      id: "block_3",
      text: "Beijing is the capital of China and a renowned historical and cultural city.",
      type: "paragraph",
    },
  ];

  assert.deepEqual(
    getInvalidEditBlocksFallback({
      documentAction: "edit_blocks",
      documentBlocks,
      prompt: "把英文翻译精简一些并修改。",
    }),
    {
      blockId: "block_3",
      kind: "replace_block",
      summary: "已更新当前英文翻译。",
    },
  );
});

test("wraps shortened English translation prose into a replace-block fallback", () => {
  assert.equal(
    sanitizeAiAssistantText(
      "英文版规划内容原文较长，可以精简为以下版本：\n\n原文： The Beijing Urban Master Plan (2016–2035) positions Beijing as the national political center.\n\n精简版： The Beijing Urban Master Plan (2016–2035) defines Beijing as China's political, cultural, international exchange, and innovation hub.",
      "edit_blocks",
      null,
      {
        blockId: "block_translation",
        kind: "replace_block",
        summary: "已更新当前英文翻译。",
      },
    ),
    '{"summary":"已更新当前英文翻译。","operations":[{"blockId":"block_translation","content":"The Beijing Urban Master Plan (2016–2035) defines Beijing as China\'s political, cultural, international exchange, and innovation hub.","type":"replace_block"}]}',
  );
});

test("leaves valid edit-block JSON unchanged", () => {
  const payload = '{"summary":"已插入表格。","operations":[{"type":"insert_after_block"}]}';

  assert.equal(sanitizeAiAssistantText(payload, "edit_blocks"), payload);
});
