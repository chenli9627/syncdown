import { NextResponse } from "next/server";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import type {
  AiChatDocumentAction,
  AiChatMessage,
  AiChatMessageMetadata,
  AiChatModelKey,
  AiChatResponseMode,
  AiChatSelection,
} from "@/features/app-state/types";
import {
  saveAiChatThreadMessages,
} from "@/features/app-state/lib/mutations";
import { parseAiDocumentEditPlan } from "@/features/editor/lib/ai-chat-document-edit-plan";
import { withAiChatMessageEditPlan } from "@/features/editor/lib/ai-chat-message-edit-plan";
import { sanitizeAiChatMessage } from "@/features/editor/lib/ai-chat-output-guard";
import { readStoredState, writeStoredState } from "@/lib/server/state-store";

export function sanitizeFinishedMessages(
  messages: AiChatMessage[],
  documentAction: AiChatDocumentAction | null,
  responseMode: AiChatResponseMode | null,
) {
  const lastAssistantIndex = findLastAssistantMessageIndex(messages);

  return messages.map((message, index) =>
    applyEditPlanMetadata(
      ensureVisibleAssistantText(
        sanitizeAiChatMessage(
          message,
          index === lastAssistantIndex ? documentAction : null,
          index === lastAssistantIndex ? responseMode : null,
        ),
        index === lastAssistantIndex ? documentAction : null,
      ),
      index === lastAssistantIndex ? documentAction : null,
    ),
  );
}

export function getNoMoreToolCallsInstruction(documentAction: AiChatDocumentAction | null) {
  const baseInstruction =
    "You have already attempted the available web fetches. Do not call any more tools in this step. Give the user a visible final answer based only on the available tool results.";

  if (documentAction === "edit_blocks") {
    return `${baseInstruction} If the requested current web data could not be fetched reliably, return exactly valid JSON with a short Chinese summary and an empty operations array, for example {"summary":"无法获取可靠的实时网页数据，未修改文档。","operations":[]}.`;
  }

  return `${baseInstruction} If the requested current web data could not be fetched reliably, say so briefly in Chinese and do not invent the data.`;
}

export function withChatMetadata(
  message: AiChatMessage,
  metadata: Omit<NonNullable<AiChatMessage["metadata"]>, "createdAt">,
): AiChatMessage {
  return {
    ...message,
    metadata: {
      ...message.metadata,
      ...metadata,
      createdAt: message.metadata?.createdAt ?? new Date().toISOString(),
    },
  };
}

export function replaceMessageText(message: AiChatMessage, text: string): AiChatMessage {
  return {
    ...message,
    parts: [
      {
        text,
        type: "text",
      },
    ],
  };
}

export function getMessageText(message: AiChatMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

export function createAiChatStreamMessageMetadata({
  baseMetadata,
  documentAction,
}: {
  baseMetadata: Omit<AiChatMessageMetadata, "editPlan">;
  documentAction: AiChatDocumentAction | null;
}) {
  let streamedText = "";

  return ({ part }: { part: { type: string; text?: string } }) => {
    if (part.type === "text-delta" && typeof part.text === "string") {
      streamedText += part.text;
      return baseMetadata;
    }

    if (part.type !== "finish") {
      return baseMetadata;
    }

    return documentAction === "edit_blocks"
      ? {
          ...baseMetadata,
          editPlan: parseAiDocumentEditPlan(streamedText),
        }
      : baseMetadata;
  };
}

export function formatAiChatStreamError(error: unknown) {
  const message =
    error instanceof Error ? error.message.trim() : typeof error === "string" ? error.trim() : "";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("content exists risk") ||
    lowerMessage.includes("content risk") ||
    lowerMessage.includes("safety") ||
    lowerMessage.includes("moderation")
  ) {
    return "请求被模型服务拦截。请换一种表达，或切换到另一个模型后再试。";
  }

  if (lowerMessage.includes("service is not configured")) {
    return "AI 服务未配置。";
  }

  return message || "AI 请求失败。";
}

export async function respondWithAssistantText({
  clarificationKind,
  documentAction,
  documentId,
  messageId,
  modelKey,
  modelName,
  responseMode,
  selection,
  text,
  threadId,
  userId,
  userMessages,
}: {
  clarificationKind?: string;
  documentAction: AiChatDocumentAction | null;
  documentId: string;
  messageId: string;
  modelKey: AiChatModelKey;
  modelName: string;
  responseMode: AiChatResponseMode | null;
  selection: AiChatSelection | null;
  text: string;
  threadId: string;
  userId: string;
  userMessages: AiChatMessage[];
}) {
  const assistantMessage = withChatMetadata(
    {
      id: messageId,
      parts: [{ text, type: "text" }],
      role: "assistant",
    },
    {
      clarificationKind,
      documentAction,
      modelKey,
      modelName,
      responseMode,
      selection,
      threadId,
    },
  );
  const finalizedAssistantMessage = applyEditPlanMetadata(assistantMessage, documentAction);
  const latestState = await readStoredState();
  const saveResult = saveAiChatThreadMessages(
    latestState,
    userId,
    documentId,
    [...userMessages, finalizedAssistantMessage],
    { threadId },
  );

  if (!saveResult.ok) {
    return NextResponse.json({ error: saveResult.error }, { status: 403 });
  }

  await writeStoredState(saveResult.state);

  return createUIMessageStreamResponse({
    stream: createUIMessageStream<AiChatMessage>({
      onError: (error) => formatAiChatStreamError(error),
      originalMessages: userMessages,
      execute: ({ writer }) => {
        writer.write({
          messageId,
          messageMetadata: finalizedAssistantMessage.metadata,
          type: "start",
        });
        writer.write({ type: "start-step" });
        writer.write({ id: "txt-0", type: "text-start" });
        writer.write({ delta: text, id: "txt-0", type: "text-delta" });
        writer.write({ id: "txt-0", type: "text-end" });
        writer.write({ type: "finish-step" });
        writer.write({
          finishReason: "stop",
          messageMetadata: finalizedAssistantMessage.metadata,
          type: "finish",
        });
      },
    }),
  });
}

export async function respondWithDeterministicEditPayload({
  documentAction,
  documentId,
  messageId,
  modelKey,
  modelName,
  payloadText,
  responseMode,
  selection,
  threadId,
  userId,
  userMessages,
}: {
  documentAction: AiChatDocumentAction | null;
  documentId: string;
  messageId: string;
  modelKey: AiChatModelKey;
  modelName: string;
  payloadText: string;
  responseMode: AiChatResponseMode | null;
  selection: AiChatSelection | null;
  threadId: string;
  userId: string;
  userMessages: AiChatMessage[];
}) {
  const assistantMessage = withChatMetadata(
    {
      id: messageId,
      parts: [{ text: payloadText, type: "text" }],
      role: "assistant",
    },
    {
      documentAction,
      modelKey,
      modelName,
      responseMode,
      selection,
      threadId,
    },
  );
  const finalizedAssistantMessage = applyEditPlanMetadata(assistantMessage, documentAction);
  const latestState = await readStoredState();
  const saveResult = saveAiChatThreadMessages(
    latestState,
    userId,
    documentId,
    [...userMessages, finalizedAssistantMessage],
    { threadId },
  );

  if (!saveResult.ok) {
    return NextResponse.json({ error: saveResult.error }, { status: 403 });
  }

  await writeStoredState(saveResult.state);

  return createUIMessageStreamResponse({
    stream: createUIMessageStream<AiChatMessage>({
      onError: (error) => formatAiChatStreamError(error),
      originalMessages: userMessages,
      execute: ({ writer }) => {
        writer.write({
          messageId,
          messageMetadata: finalizedAssistantMessage.metadata,
          type: "start",
        });
        writer.write({ type: "start-step" });
        writer.write({ id: "txt-0", type: "text-start" });
        writer.write({ delta: payloadText, id: "txt-0", type: "text-delta" });
        writer.write({ id: "txt-0", type: "text-end" });
        writer.write({ type: "finish-step" });
        writer.write({
          finishReason: "stop",
          messageMetadata: finalizedAssistantMessage.metadata,
          type: "finish",
        });
      },
    }),
  });
}

function findLastAssistantMessageIndex(messages: AiChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "assistant") {
      return index;
    }
  }

  return -1;
}

export function applyEditPlanMetadata(
  message: AiChatMessage,
  documentAction: AiChatDocumentAction | null,
) {
  return documentAction === "edit_blocks"
    ? withAiChatMessageEditPlan(message, documentAction)
    : message;
}

function ensureVisibleAssistantText(
  message: AiChatMessage,
  documentAction: AiChatDocumentAction | null,
) {
  if (message.role !== "assistant" || getMessageText(message)) {
    return message;
  }

  const hasToolParts = message.parts.some((part) => part.type.startsWith("tool-"));

  if (!hasToolParts) {
    return message;
  }

  return {
    ...message,
    parts: [
      ...message.parts,
      {
        text:
          documentAction === "edit_blocks"
            ? '{"summary":"模型未返回可见回答，未修改文档。","operations":[]}'
            : "模型没有返回可见回答。请重试一次。",
        type: "text",
      },
    ],
  };
}
