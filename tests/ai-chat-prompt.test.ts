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
  assert.match(prompt, /answer the user's actual question directly/);
});
