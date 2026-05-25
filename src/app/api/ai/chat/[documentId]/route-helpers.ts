import { NextResponse } from "next/server";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type {
  AiChatMessage,
  AiChatMessageMetadata,
  AiChatModelKey,
  AiChatResponseMode,
  AiChatSelection,
} from "@/features/app-state/types";
import { saveAiChatThreadMessages } from "@/features/app-state/lib/mutations";
import { sanitizeAiChatMessage } from "@/features/editor/lib/ai-chat-output-guard";
import { readStoredState, writeStoredState } from "@/lib/server/state-store";

export function sanitizeFinishedMessages(messages: AiChatMessage[]) {
  return messages.map((message) =>
    ensureVisibleAssistantText(sanitizeAiChatMessage(message, null, message.metadata?.responseMode ?? null)),
  );
}

export function getNoMoreToolCallsInstruction() {
  return "You have already attempted the available web fetches. Do not call any more tools in this step. Give the user a visible final answer based only on the available tool results. If the requested current web data could not be fetched reliably, say so briefly in Chinese and do not invent the data.";
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
    parts: [{ text, type: "text" }],
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
}: {
  baseMetadata: AiChatMessageMetadata;
}) {
  return () => baseMetadata;
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
      modelKey,
      modelName,
      responseMode,
      selection,
      threadId,
    },
  );
  const latestState = await readStoredState();
  const saveResult = saveAiChatThreadMessages(
    latestState,
    userId,
    documentId,
    [...userMessages, assistantMessage],
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
          messageMetadata: assistantMessage.metadata,
          type: "start",
        });
        writer.write({ type: "start-step" });
        writer.write({ id: "txt-0", type: "text-start" });
        writer.write({ delta: text, id: "txt-0", type: "text-delta" });
        writer.write({ id: "txt-0", type: "text-end" });
        writer.write({ type: "finish-step" });
        writer.write({
          finishReason: "stop",
          messageMetadata: assistantMessage.metadata,
          type: "finish",
        });
      },
    }),
  });
}

function ensureVisibleAssistantText(message: AiChatMessage) {
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
        text: "模型没有返回可见回答。请重试一次。",
        type: "text",
      },
    ],
  };
}
