import { NextResponse } from "next/server";
import {
  convertToModelMessages,
  createIdGenerator,
  streamText,
} from "ai";
import type {
  AiChatDocumentAction,
  AiChatMessage,
  AiChatModelKey,
  AiChatSelection,
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

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

type ChatBody = {
  documentAction?: AiChatDocumentAction | null;
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
    ? result.threads.find((thread) => thread.id === threadId) ?? null
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
    system: buildDocumentChatSystemPrompt(
      body.documentTitle ?? "",
      body.documentText ?? "",
      body.selection ?? null,
      modelConfig.name,
      body.documentAction ?? null,
    ),
    temperature: 0.3,
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

function buildDocumentChatSystemPrompt(
  documentTitle: string,
  documentText: string,
  selection: AiChatSelection | null,
  modelName: string,
  documentAction: AiChatDocumentAction | null,
) {
  const cleanDocumentTitle = documentTitle.trim() || "(untitled document)";
  const cleanDocumentText = documentText.trim() || "(empty document)";
  const selectionText = selection?.text.trim();

  return [
    "You are Syncdown's document assistant.",
    `The currently selected AI model is exactly: ${modelName}.`,
    "If the user asks what model you are, answer with that exact model name and do not claim to be a different model.",
    "You can help the user discuss, rewrite, summarize, expand, translate, and structure the current document.",
    documentAction
      ? "The frontend will automatically apply your next answer to the current document."
      : "When the user asks for an edit, return content that can be inserted into the document directly.",
    getAutomaticActionInstruction(documentAction),
    "Use Markdown when lists, headings, or emphasis make the answer clearer.",
    documentAction
      ? "Do not claim that the document has already changed while you are generating the answer."
      : "Do not claim to have changed the document yourself; the user applies your response with explicit buttons.",
    "",
    "Current document title:",
    cleanDocumentTitle,
    "",
    "Current document plain text:",
    cleanDocumentText,
    selectionText ? "\nCurrent selected text:\n" + selectionText : "",
  ].join("\n");
}

function getAutomaticActionInstruction(documentAction: AiChatDocumentAction | null) {
  if (documentAction === "insert_end") {
    return "The requested automatic action is: insert your answer at the end of the document. Return only the exact content that should be inserted. Do not say you inserted it, and do not include surrounding explanation unless it is part of the inserted content.";
  }

  if (documentAction === "insert_cursor") {
    return "The requested automatic action is: insert your answer at the current cursor position. Return only the exact content that should be inserted. Do not say you inserted it, and do not include surrounding explanation unless it is part of the inserted content.";
  }

  if (documentAction === "replace_document") {
    return "The requested automatic action is: replace the current document body with your answer. Return the complete new document body in Markdown. Preserve useful existing content unless the user explicitly asks to remove it. Do not explain the change, and do not say you replaced the document.";
  }

  if (documentAction === "replace_selection") {
    return "The requested automatic action is: replace the selected text with your answer. Return only the exact replacement content. Do not quote the original text, do not explain the change, and do not say you replaced it.";
  }

  return "";
}
