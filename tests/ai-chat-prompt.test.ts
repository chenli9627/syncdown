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
  assert.match(prompt, /answer directly with the requested content or explanation/);
  assert.doesNotMatch(prompt, /explicit buttons/);
  assert.doesNotMatch(prompt, /user applies your response/);
});
