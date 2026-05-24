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
  createAiChatModel,
  getAiChatModelConfig,
  getConfiguredAiChatModels,
} from "@/lib/server/ai-models";
import { readStoredState, writeStoredState } from "@/lib/server/state-store";
import { aiWebFetchTools } from "@/lib/server/ai-web-fetch";
import { buildDocumentChatSystemPrompt } from "./prompt";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

type ChatBody = {
  documentAction?: AiChatDocumentAction | null;
  documentBlocks?: AiChatDocumentBlock[];
  documentText?: string;
  documentTitle?: string;
  messages?: AiChatMessage[];
  modelKey?: AiChatModelKey;
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

  const result = streamText({
    messages: await convertToModelMessages(messages),
    model: createAiChatModel(modelConfig),
    stopWhen: stepCountIs(6),
    system: buildDocumentChatSystemPrompt(
      body.documentTitle ?? "",
      body.documentText ?? "",
      body.documentBlocks ?? [],
      body.selection ?? null,
      modelConfig.name,
      body.documentAction ?? null,
    ),
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
            modelKey,
            modelName: modelConfig.name,
            selection: body.selection ?? null,
            threadId: activeThreadId,
          }
        : undefined,
    onFinish: async ({ messages: finishedMessages }) => {
      const latestState = await readStoredState();
      const saveResult = saveAiChatThreadMessages(
        latestState,
        body.userId ?? "",
        documentId,
        finishedMessages,
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
