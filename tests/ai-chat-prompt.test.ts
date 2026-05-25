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
  assert.match(prompt, /do not copy raw HTML tags or angle-bracket markup/i);
  assert.match(prompt, /Never ask the user for permission to continue reading/);
  assert.match(prompt, /answer the user's actual question directly/i);
});

test("AI chat prompt makes the panel discussion-only", () => {
  const prompt = buildDocumentChatSystemPrompt(
    "HN summary",
    "",
    [],
    null,
    "deepseek-v4-flash",
    "list",
  );

  assert.match(prompt, /does not edit the document/i);
  assert.match(prompt, /does not perform document edits/i);
  assert.match(prompt, /Never tell the user to copy, paste, manually insert/i);
  assert.match(prompt, /Return only the final Markdown list itself/);
  assert.doesNotMatch(prompt, /automatic document action/i);
  assert.doesNotMatch(prompt, /Return only valid JSON/i);
});

test("AI chat prompt includes rich-text blocks for formatting questions", () => {
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
