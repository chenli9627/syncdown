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
  assert.match(prompt, /answer directly with the requested content or explanation/);
  assert.doesNotMatch(prompt, /explicit buttons/);
  assert.doesNotMatch(prompt, /user applies your response/);
});

test("AI chat prompt treats automatic document edits as real app edits", () => {
  const prompt = buildDocumentChatSystemPrompt(
    "Daily trends",
    "今日热搜 TOP10",
    [{ id: "block_1", text: "今日热搜 TOP10", type: "heading", level: 2 }],
    null,
    "deepseek-v4-flash",
    "edit_blocks",
  );

  assert.match(prompt, /automatic document actions are real app-driven edits/);
  assert.match(prompt, /Do not apologize by saying you cannot directly modify/);
  assert.match(prompt, /treat those messages as obsolete/);
  assert.match(prompt, /where a previous automatic document edit went/);
  assert.match(prompt, /summary must say what changed and where it was placed/);
  assert.match(prompt, /set_heading_level/);
  assert.match(prompt, /set_text_marks/);
  assert.match(prompt, /set_link/);
  assert.match(prompt, /update_table_cell/);
  assert.match(prompt, /never return the full document body/);
});
