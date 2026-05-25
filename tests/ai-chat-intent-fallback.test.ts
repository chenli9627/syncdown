import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getAiChatClarificationReply,
  getAiChatUnsupportedReply,
} from "../src/features/editor/lib/ai-chat-intent-fallback";

test("returns localized clarification replies", () => {
  assert.match(
    getAiChatClarificationReply("ambiguous_edit_intent", "帮我调整一下结构"),
    /还不确定具体要怎么改/u,
  );
  assert.match(
    getAiChatClarificationReply("missing_insert_source", "put that into the document"),
    /I am not sure what content to put into the document/i,
  );
});

test("returns localized unsupported replies", () => {
  assert.match(
    getAiChatUnsupportedReply("manual_undo", "撤回上一个操作"),
    /Ctrl\+Z/u,
  );
  assert.match(
    getAiChatUnsupportedReply("whole_document_rewrite", "Rewrite this document in a more formal tone"),
    /rewrite the whole document directly yet/i,
  );
});
