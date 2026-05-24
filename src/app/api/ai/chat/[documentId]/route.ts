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
import { sanitizeAiChatMessage } from "@/features/editor/lib/ai-chat-output-guard";
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
  const documentAction = body.documentAction ?? null;
  const systemPrompt = buildDocumentChatSystemPrompt(
    body.documentTitle ?? "",
    body.documentText ?? "",
    body.documentBlocks ?? [],
    body.selection ?? null,
    modelConfig.name,
    documentAction,
    body.applicationStatusNotices ?? [],
  );

  const result = streamText({
    messages: await convertToModelMessages(messages),
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
    experimental_transform: guardPseudoToolCallText(documentAction),
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
            selection: body.selection ?? null,
            threadId: activeThreadId,
          }
        : undefined,
    onFinish: async ({ messages: finishedMessages }) => {
      const latestState = await readStoredState();
      const sanitizedMessages = sanitizeFinishedMessages(finishedMessages, documentAction);
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
) {
  const lastAssistantIndex = findLastAssistantMessageIndex(messages);

  return messages.map((message, index) =>
    sanitizeAiChatMessage(message, index === lastAssistantIndex ? documentAction : null),
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
