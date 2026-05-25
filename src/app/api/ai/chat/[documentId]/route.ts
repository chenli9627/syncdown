import { NextResponse } from "next/server";
import {
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
import {
  withAiChatMessagesEditPlans,
  withAiChatThreadsEditPlans,
} from "@/features/editor/lib/ai-chat-message-edit-plan";
import { planAiChatServerTurn } from "@/features/editor/lib/ai-chat-server-turn-plan";
import {
  createAiChatModel,
  getAiChatModelConfig,
  getConfiguredAiChatModels,
} from "@/lib/server/ai-models";
import { getDeterministicAiChatReply } from "@/lib/server/ai-deterministic-replies";
import { getDeterministicWeatherTableEditPayload } from "@/lib/server/ai-deterministic-weather-table-edit";
import { readStoredState, writeStoredState } from "@/lib/server/state-store";
import { aiWebFetchTools } from "@/lib/server/ai-web-fetch";
import {
  getInvalidEditBlocksFallback,
  guardPseudoToolCallText,
} from "@/lib/server/ai-output-guard";
import {
  createAiChatStreamMessageMetadata,
  formatAiChatStreamError,
  getMessageText,
  getNoMoreToolCallsInstruction,
  replaceMessageText,
  respondWithAssistantText,
  respondWithDeterministicEditPayload,
  sanitizeFinishedMessages,
  withChatMetadata,
} from "./route-helpers";
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

  const threads = withAiChatThreadsEditPlans(result.threads);
  const activeThread = threadId
    ? threads.find((thread: AiChatThread) => thread.id === threadId) ?? null
    : threads[0] ?? null;

  return NextResponse.json({
    models: getConfiguredAiChatModels().map(({ key, name }) => ({ key, name })),
    thread: activeThread ?? {
      documentId,
      id: null,
      messages: [],
      userId,
    },
    threads,
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
  const effectivePrompt = body.resolvedPrompt?.trim() || getMessageText(incomingMessage);
  const serverTurnPlan = planAiChatServerTurn({
    documentBlocks: body.documentBlocks ?? [],
    documentText: body.documentText ?? "",
    messages,
    prompt: effectivePrompt,
    selection: body.selection ?? null,
  });
  if (serverTurnPlan.kind === "clarify") {
    return respondWithAssistantText({
      clarificationKind: serverTurnPlan.clarificationKind,
      documentAction: null,
      documentId,
      messageId: createIdGenerator({ prefix: "ai_msg", size: 16 })(),
      modelKey,
      modelName: modelConfig.name,
      responseMode: null,
      selection: body.selection ?? null,
      text: serverTurnPlan.text,
      threadId: activeThreadId,
      userId: body.userId,
      userMessages: messages,
    });
  }

  if (serverTurnPlan.kind === "unsupported") {
    return respondWithAssistantText({
      documentAction: null,
      documentId,
      messageId: createIdGenerator({ prefix: "ai_msg", size: 16 })(),
      modelKey,
      modelName: modelConfig.name,
      responseMode: null,
      selection: body.selection ?? null,
      text: serverTurnPlan.text,
      threadId: activeThreadId,
      userId: body.userId,
      userMessages: messages,
    });
  }
  const documentAction = serverTurnPlan.documentAction;
  const responseMode = serverTurnPlan.responseMode;
  const invalidEditBlocksFallback = getInvalidEditBlocksFallback({
    documentAction,
    documentBlocks: body.documentBlocks ?? [],
    prompt: effectivePrompt,
  });

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

  if (serverTurnPlan.kind === "deterministic_edit") {
    return respondWithDeterministicEditPayload({
      documentAction,
      documentId,
      messageId: createIdGenerator({ prefix: "ai_msg", size: 16 })(),
      modelKey,
      modelName: modelConfig.name,
      payloadText: serverTurnPlan.payloadText,
      responseMode,
      selection: body.selection ?? null,
      threadId: activeThreadId,
      userId: body.userId,
      userMessages: messages,
    });
  }

  if (serverTurnPlan.kind === "llm_edit") {
    const deterministicWeatherEdit = await getDeterministicWeatherTableEditPayload(
      effectivePrompt,
      body.documentBlocks ?? [],
    );

    if (deterministicWeatherEdit) {
      return respondWithDeterministicEditPayload({
        documentAction,
        documentId,
        messageId: createIdGenerator({ prefix: "ai_msg", size: 16 })(),
        modelKey,
        modelName: modelConfig.name,
        payloadText: deterministicWeatherEdit,
        responseMode,
        selection: body.selection ?? null,
        threadId: activeThreadId,
        userId: body.userId,
        userMessages: messages,
      });
    }
  }

  if (serverTurnPlan.kind === "llm" && !serverTurnPlan.documentAction) {
    const deterministicReply = await getDeterministicAiChatReply(effectivePrompt);

    if (deterministicReply) {
      return respondWithAssistantText({
        documentAction: null,
        documentId,
        messageId: createIdGenerator({ prefix: "ai_msg", size: 16 })(),
        modelKey,
        modelName: modelConfig.name,
        responseMode,
        selection: body.selection ?? null,
        text: deterministicReply,
        threadId: activeThreadId,
        userId: body.userId,
        userMessages: messages,
      });
    }
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
    experimental_transform: guardPseudoToolCallText(
      documentAction,
      responseMode,
      invalidEditBlocksFallback,
    ),
    stopWhen: stepCountIs(8),
    system: systemPrompt,
    temperature: 0.3,
    tools: aiWebFetchTools,
  });

  result.consumeStream();
  const messageMetadata = createAiChatStreamMessageMetadata({
    baseMetadata: {
      createdAt: new Date().toISOString(),
      documentAction,
      modelKey,
      modelName: modelConfig.name,
      responseMode,
      selection: body.selection ?? null,
      threadId: activeThreadId,
    },
    documentAction,
  });

  return result.toUIMessageStreamResponse<AiChatMessage>({
    generateMessageId: createIdGenerator({ prefix: "ai_msg", size: 16 }),
    messageMetadata,
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
  const threads = withAiChatThreadsEditPlans(result.threads);

  return NextResponse.json({
    thread: threads[0] ?? {
      documentId,
      id: null,
      messages: withAiChatMessagesEditPlans([]),
      userId,
    },
    threads,
  });
}
