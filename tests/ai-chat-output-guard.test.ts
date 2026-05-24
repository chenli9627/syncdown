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

test("sanitizes invalid edit-block prose into an empty operation payload", () => {
  assert.equal(
    sanitizeAiAssistantText("很抱歉，接口返回 403，无法获取微博热搜。", "edit_blocks"),
    '{"summary":"无法获取可靠的实时网页数据，未修改文档。","operations":[]}',
  );
});

test("leaves valid edit-block JSON unchanged", () => {
  const payload = '{"summary":"已插入表格。","operations":[{"type":"insert_after_block"}]}';

  assert.equal(sanitizeAiAssistantText(payload, "edit_blocks"), payload);
});
