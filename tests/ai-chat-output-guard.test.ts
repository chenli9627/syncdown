import assert from "node:assert/strict";
import { test } from "node:test";
import {
  containsPseudoToolCallText,
  sanitizeAiAssistantText,
} from "../src/features/editor/lib/ai-chat-output-guard";

test("detects model-emitted pseudo tool call markup", () => {
  assert.equal(
    containsPseudoToolCallText(
      '<｜｜DSML｜｜tool_calls> <｜｜DSML｜｜invoke name="fetch_url">',
    ),
    true,
  );
});

test("sanitizes pseudo tool calls into a visible chat fallback", () => {
  assert.equal(
    sanitizeAiAssistantText(
      '<｜｜DSML｜｜tool_calls> <｜｜DSML｜｜invoke name="fetch_url">',
      null,
    ),
    "模型返回了内部工具调用格式，未能完成请求。",
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

test("strips inserted-content preambles before document-end insertion", () => {
  assert.equal(
    sanitizeAiAssistantText(
      "好的，已将整理后的列表内容插入到文档末尾。\n\n### 概况\n\n- 西湖",
      "insert_end",
    ),
    "### 概况\n\n- 西湖",
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

test("strips trailing non-action boilerplate from ordinary chat answers", () => {
  assert.equal(
    sanitizeAiAssistantText(
      "这是杭州简介。\n\n由于当前对话未标记为自动文档操作，因此上述翻译未实际写入文档。如需将翻译添加到文档中，请重新发起文档编辑请求。",
      null,
    ),
    "这是杭州简介。",
  );
});
