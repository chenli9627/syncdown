import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDocumentChatSystemPrompt } from "../src/app/api/ai/chat/[documentId]/prompt";

test("AI chat prompt hides web fetch implementation details from final answers", () => {
  const prompt = buildDocumentChatSystemPrompt(
    "Web note",
    "",
    [],
    null,
    "deepseek-v4-flash",
    null,
  );

  assert.match(prompt, /Do not describe internal tool calls/);
  assert.match(prompt, /Never output pseudo tool-call markup/);
  assert.match(prompt, /DSML tags/);
  assert.match(prompt, /request counts/);
  assert.match(prompt, /hasMore/);
  assert.match(prompt, /nextStart/);
  assert.match(prompt, /do not copy raw HTML tags or angle-bracket markup/);
  assert.match(prompt, /Never ask the user for permission to continue reading/);
  assert.match(prompt, /answer the user's actual question directly/);
});

test("AI chat prompt does not tell the model to invent UI apply instructions", () => {
  const prompt = buildDocumentChatSystemPrompt(
    "HN summary",
    "",
    [],
    null,
    "deepseek-v4-flash",
    null,
  );

  assert.match(prompt, /Never add UI instructions/);
  assert.match(prompt, /Never tell the user to copy, paste, manually insert/);
  assert.match(prompt, /not marked as an automatic document action/);
  assert.match(prompt, /do not say you changed it, fixed it, applied it, or updated it/);
  assert.match(prompt, /no document change was applied/);
  assert.match(prompt, /Do not invent a new document change/);
  assert.match(prompt, /current document snapshot show the change/);
  assert.match(prompt, /most recent substantive assistant answer as the source/);
  assert.match(prompt, /real Markdown list with list markers/);
  assert.match(prompt, /real Markdown table instead of prose/);
  assert.doesNotMatch(prompt, /explicit buttons/);
  assert.doesNotMatch(prompt, /user applies your response/);
});

test("AI chat prompt includes rich-text blocks for ordinary document questions", () => {
  const prompt = buildDocumentChatSystemPrompt(
    "Formatted note",
    "北京 官网",
    [
      {
        html: "<p><strong>北京</strong> <a href=\"https://example.com\">官网</a></p>",
        id: "block_1",
        markdown: "**北京** [官网](https://example.com)",
        text: "北京 官网",
        type: "paragraph",
      },
    ],
    null,
    "deepseek-v4-flash",
    null,
  );

  assert.match(prompt, /Current document blocks with rich-text structure/);
  assert.match(prompt, /\*\*北京\*\*/);
  assert.match(prompt, /<strong>北京<\/strong>/);
  assert.match(prompt, /Use block markdown\/html fields to answer questions about formatting/);
});

test("AI chat prompt treats automatic document edits as real app edits", () => {
  const prompt = buildDocumentChatSystemPrompt(
    "Daily trends",
    "今日热搜 TOP10",
    [{ id: "block_1", text: "今日热搜 TOP10", type: "heading", level: 2 }],
    null,
    "deepseek-v4-flash",
    "edit_blocks",
    [
      "已修改文档：已删除文档中的表格。",
      "未修改文档：No matching document target found.",
    ],
  );

  assert.match(prompt, /automatic document actions are real app-driven edits/);
  assert.match(prompt, /Never return pseudo tool-call markup/);
  assert.match(prompt, /current web data cannot be fetched reliably/);
  assert.match(prompt, /Do not apologize by saying you cannot directly modify/);
  assert.match(prompt, /treat those messages as obsolete/);
  assert.match(prompt, /verify against the current document title, text, blocks/);
  assert.match(prompt, /Never claim you checked the live editor/);
  assert.match(prompt, /explicit Syncdown status notices/);
  assert.match(prompt, /latest explicit Syncdown status notice as authoritative/);
  assert.match(prompt, /most recent attempted operation did not modify the document/);
  assert.doesNotMatch(prompt, /Do not deny that the app applied it/);
  assert.match(prompt, /summary must say what changed and where it was placed/);
  assert.match(prompt, /set_heading_level/);
  assert.match(prompt, /set_text_marks/);
  assert.match(prompt, /set_link/);
  assert.match(prompt, /update_table_cell/);
  assert.match(prompt, /move_block/);
  assert.match(prompt, /set_task_item_checked/);
  assert.match(prompt, /insert_table_row_after/);
  assert.match(prompt, /Do not use image or media operations/);
  assert.match(prompt, /does not specify a location/);
  assert.match(prompt, /last non-empty document block/);
  assert.match(prompt, /extract the referenced content from the conversation history/);
  assert.match(prompt, /use the most recent substantive assistant answer as the source content/);
  assert.match(prompt, /preserve its Markdown table, heading, list, and paragraph structure/);
  assert.match(prompt, /unsupported, too complex, ambiguous/);
  assert.match(prompt, /I cannot do that edit yet/);
  assert.match(prompt, /do not replace the full document or most of its blocks/);
  assert.match(prompt, /I cannot do whole-document replacement yet/);
  assert.match(prompt, /Never return a rewritten full document as a workaround/);
  assert.match(prompt, /never return the full document body/);
  assert.match(prompt, /Recent explicit Syncdown status notices/);
  assert.match(prompt, /已修改文档：已删除文档中的表格/);
  assert.match(prompt, /latest: 未修改文档：No matching document target found/);
});
