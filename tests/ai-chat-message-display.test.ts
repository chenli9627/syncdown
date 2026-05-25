import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildChatMessageDisplayText,
  buildPendingDocumentActionText,
} from "../src/features/editor/components/editor-ai-chat-message-display";

const t = (key: string) =>
  (
    {
      aiPendingDocumentAction: "待确认修改：确认后才会写入文档。",
      aiPendingGeneratedContent: "待确认修改：确认后会把下面内容写入文档。",
      aiUnconfirmedDocumentAction: "未修改文档：这次修改尚未确认。",
    } as Record<string, string>
  )[key] ?? key;

test("shows pending document action summary and preview lines", () => {
  assert.equal(
    buildPendingDocumentActionText(
      {
        action: "edit_blocks",
        message: {
          id: "msg_1",
          parts: [],
          role: "assistant",
        },
        messageId: "msg_1",
        plan: {
          payload: {
            operations: [],
            summary: "已删除“景点”标题及其下方的景点列表。",
          },
          previewLines: ["将删除一个块", "将删除一个块"],
          requestedCount: 2,
          responseText: "",
          summary: "已删除“景点”标题及其下方的景点列表。",
        },
      },
      t,
    ),
    "待确认修改：确认后才会写入文档。\n\n将删除“景点”标题及其下方的景点列表。\n\n- 将删除一个块\n- 将删除一个块",
  );
});

test("keeps applied document edit details in the chat bubble", () => {
  assert.equal(
    buildChatMessageDisplayText({
      appliedNotice: "已修改文档：已删除“景点”标题及其下方的景点列表。",
      fallbackNotice: "正在确认文档修改结果…",
      isAutomaticDocumentAction: true,
      pendingDocumentAction: null,
      t,
      toolPreviewLines: ["将删除一个块", "将删除一个块"],
      toolSummary: "已删除“景点”标题及其下方的景点列表。",
    }),
    "已修改文档：已删除“景点”标题及其下方的景点列表。\n\n- 将删除一个块\n- 将删除一个块",
  );
});

test("shows unconfirmed automatic edit details before confirmation", () => {
  assert.equal(
    buildChatMessageDisplayText({
      appliedNotice: undefined,
      fallbackNotice: "正在确认文档修改结果…",
      isAutomaticDocumentAction: true,
      pendingDocumentAction: null,
      plainText: "",
      t,
      toolPreviewLines: ["将标题调整为 3 级"],
      toolSummary: "已将所有标题缩小一个等级。",
    }),
    "未修改文档：这次修改尚未确认。\n\n- 将标题调整为 3 级",
  );
});

test("keeps ordinary assistant text for non-document replies", () => {
  assert.equal(
    buildChatMessageDisplayText({
      appliedNotice: undefined,
      fallbackNotice: "正在确认文档修改结果…",
      isAutomaticDocumentAction: false,
      pendingDocumentAction: null,
      plainText: "北京 北京市 今天（2026-05-25）天气预报：小雨，19-22°C。",
      t,
      toolPreviewLines: [],
      toolSummary: null,
    }),
    "北京 北京市 今天（2026-05-25）天气预报：小雨，19-22°C。",
  );
});
