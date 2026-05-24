import { NextResponse } from "next/server";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  createIdGenerator,
  stepCountIs,
  streamText,
} from "ai";
import type {
  AiChatDocumentBlock,
  AiChatDocumentAction,
  AiChatMessage,
  AiChatModelKey,
  AiChatResponseMode,
  AiChatSelection,
  AiChatThread,
} from "@/features/app-state/types";
import {
  deleteAiChatThreadForUser,
  getAiChatThreadForUser,
  getAiChatThreadsForUser,
  saveAiChatThreadMessages,
} from "@/features/app-state/lib/mutations";
import { sanitizeAiChatMessage } from "@/features/editor/lib/ai-chat-output-guard";
import { buildDeterministicAiDocumentEditPayload } from "@/features/editor/lib/ai-chat-deterministic-document-edit";
import {
  createAiChatModel,
  getAiChatModelConfig,
  getConfiguredAiChatModels,
} from "@/lib/server/ai-models";
import { readStoredState, writeStoredState } from "@/lib/server/state-store";
import { aiWebFetchTools } from "@/lib/server/ai-web-fetch";
import { guardPseudoToolCallText } from "@/lib/server/ai-output-guard";
import { buildDocumentChatSystemPrompt } from "./prompt";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

type ChatBody = {
  applicationStatusNotices?: string[];
  documentAction?: AiChatDocumentAction | null;
  documentBlocks?: AiChatDocumentBlock[];
  documentText?: string;
  documentTitle?: string;
  messages?: AiChatMessage[];
  modelKey?: AiChatModelKey;
  responseMode?: AiChatResponseMode | null;
  resolvedPrompt?: string;
  selection?: AiChatSelection | null;
  threadId?: string | null;
  userId?: string;
};

export async function GET(request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const threadId = url.searchParams.get("threadId");

  if (!userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  const state = await readStoredState();
  const result = getAiChatThreadsForUser(state, userId, documentId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  const activeThread = threadId
    ? result.threads.find((thread: AiChatThread) => thread.id === threadId) ?? null
    : result.threads[0] ?? null;

  return NextResponse.json({
    models: getConfiguredAiChatModels().map(({ key, name }) => ({ key, name })),
    thread: activeThread ?? {
      documentId,
      id: null,
      messages: [],
      userId,
    },
    threads: result.threads,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const body = (await request.json().catch(() => null)) as ChatBody | null;

  if (!body?.userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  if (!body.messages?.length || body.messages[body.messages.length - 1]?.role !== "user") {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const modelKey = body.modelKey === "secondary" ? "secondary" : "primary";
  const modelConfig = getAiChatModelConfig(modelKey);

  if (!modelConfig) {
    return NextResponse.json({ error: "AI service is not configured" }, { status: 503 });
  }

  const state = await readStoredState();
  const threadResult = getAiChatThreadForUser(
    state,
    body.userId,
    documentId,
    body.threadId,
  );

  if (!threadResult.ok) {
    return NextResponse.json({ error: threadResult.error }, { status: 403 });
  }

  const requestMessages = body.messages;
  const threadId = body.threadId?.trim() || null;
  const incomingMessage = withChatMetadata(requestMessages[requestMessages.length - 1], {
    modelKey,
    modelName: modelConfig.name,
    selection: body.selection ?? null,
    threadId: threadId ?? undefined,
  });
  const messages = [...requestMessages.slice(0, -1), incomingMessage];
  const modelMessages = body.resolvedPrompt?.trim()
    ? [
        ...messages.slice(0, -1),
        replaceMessageText(incomingMessage, body.resolvedPrompt.trim()),
      ]
    : messages;
  const saveUserMessageResult = saveAiChatThreadMessages(
    state,
    body.userId,
    documentId,
    messages,
    { threadId },
  );

  if (!saveUserMessageResult.ok) {
    return NextResponse.json({ error: saveUserMessageResult.error }, { status: 403 });
  }

  await writeStoredState(saveUserMessageResult.state);
  const activeThreadId = saveUserMessageResult.thread.id;
  const documentAction = body.documentAction ?? null;
  const responseMode = body.responseMode ?? null;
  const effectivePrompt = body.resolvedPrompt?.trim() || getMessageText(incomingMessage);
  const systemPrompt = buildDocumentChatSystemPrompt(
    body.documentTitle ?? "",
    body.documentText ?? "",
    body.documentBlocks ?? [],
    body.selection ?? null,
    modelConfig.name,
    documentAction,
    responseMode,
    body.applicationStatusNotices ?? [],
  );
  const deterministicPayload =
    documentAction === "edit_blocks"
      ? buildDeterministicAiDocumentEditPayload(
          effectivePrompt,
          body.documentBlocks ?? [],
        )
      : null;

  if (deterministicPayload) {
    return respondWithDeterministicEditPayload({
      documentAction,
      documentId,
      messageId: createIdGenerator({ prefix: "ai_msg", size: 16 })(),
      modelKey,
      modelName: modelConfig.name,
      payloadText: JSON.stringify(deterministicPayload),
      responseMode,
      selection: body.selection ?? null,
      threadId: activeThreadId,
      userId: body.userId,
      userMessages: messages,
    });
  }

  const result = streamText({
    messages: await convertToModelMessages(modelMessages),
    model: createAiChatModel(modelConfig),
    prepareStep: ({ stepNumber }) => {
      if (stepNumber < 5) {
        return undefined;
      }

      return {
        activeTools: [],
        system: `${systemPrompt}\n\n${getNoMoreToolCallsInstruction(documentAction)}`,
        toolChoice: "none",
      };
    },
    experimental_transform: guardPseudoToolCallText(documentAction, responseMode),
    stopWhen: stepCountIs(8),
    system: systemPrompt,
    temperature: 0.3,
    tools: aiWebFetchTools,
  });

  result.consumeStream();

  return result.toUIMessageStreamResponse<AiChatMessage>({
    generateMessageId: createIdGenerator({ prefix: "ai_msg", size: 16 }),
    messageMetadata: ({ part }) =>
      part.type === "start" || part.type === "finish"
        ? {
            createdAt: new Date().toISOString(),
            documentAction,
            modelKey,
            modelName: modelConfig.name,
            responseMode,
            selection: body.selection ?? null,
            threadId: activeThreadId,
          }
        : undefined,
    onError: (error) => formatAiChatStreamError(error),
    onFinish: async ({ messages: finishedMessages }) => {
      const latestState = await readStoredState();
      const sanitizedMessages = sanitizeFinishedMessages(
        finishedMessages,
        documentAction,
        responseMode,
      );
      const saveResult = saveAiChatThreadMessages(
        latestState,
        body.userId ?? "",
        documentId,
        sanitizedMessages,
        { threadId: activeThreadId },
      );

      if (saveResult.ok) {
        await writeStoredState(saveResult.state);
      }
    },
    originalMessages: messages,
    sendReasoning: false,
  });
}

function sanitizeFinishedMessages(
  messages: AiChatMessage[],
  documentAction: AiChatDocumentAction | null,
  responseMode: AiChatResponseMode | null,
) {
  const lastAssistantIndex = findLastAssistantMessageIndex(messages);

  return messages.map((message, index) =>
    sanitizeAiChatMessage(
      message,
      index === lastAssistantIndex ? documentAction : null,
      index === lastAssistantIndex ? responseMode : null,
    ),
  );
}

function findLastAssistantMessageIndex(messages: AiChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "assistant") {
      return index;
    }
  }

  return -1;
}

export async function DELETE(request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const threadId = url.searchParams.get("threadId");

  if (!userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  if (!threadId) {
    return NextResponse.json({ error: "Thread is required" }, { status: 400 });
  }

  const state = await readStoredState();
  const result = deleteAiChatThreadForUser(state, userId, documentId, threadId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  await writeStoredState(result.state);

  return NextResponse.json({
    thread: result.threads[0] ?? {
      documentId,
      id: null,
      messages: [],
      userId,
    },
    threads: result.threads,
  });
}

function getNoMoreToolCallsInstruction(documentAction: AiChatDocumentAction | null) {
  const baseInstruction =
    "You have already attempted the available web fetches. Do not call any more tools in this step. Give the user a visible final answer based only on the available tool results.";

  if (documentAction === "edit_blocks") {
    return `${baseInstruction} If the requested current web data could not be fetched reliably, return exactly valid JSON with a short Chinese summary and an empty operations array, for example {"summary":"无法获取可靠的实时网页数据，未修改文档。","operations":[]}.`;
  }

  return `${baseInstruction} If the requested current web data could not be fetched reliably, say so briefly in Chinese and do not invent the data.`;
}

function withChatMetadata(
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

function replaceMessageText(message: AiChatMessage, text: string): AiChatMessage {
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

function getMessageText(message: AiChatMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

function formatAiChatStreamError(error: unknown) {
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

async function respondWithDeterministicEditPayload({
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
        writer.write({ delta: payloadText, id: "txt-0", type: "text-delta" });
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
