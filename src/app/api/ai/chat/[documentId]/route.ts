import { NextResponse } from "next/server";
import {
  convertToModelMessages,
  createIdGenerator,
  streamText,
} from "ai";
import type {
  AiChatMessage,
  AiChatModelKey,
  AiChatSelection,
} from "@/features/app-state/types";
import {
  getAiChatThreadForUser,
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
  documentText?: string;
  messages?: AiChatMessage[];
  modelKey?: AiChatModelKey;
  selection?: AiChatSelection | null;
  userId?: string;
};

export async function GET(request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const userId = new URL(request.url).searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  const state = await readStoredState();
  const result = getAiChatThreadForUser(state, userId, documentId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({
    models: getConfiguredAiChatModels().map(({ key, name }) => ({ key, name })),
    thread: result.thread ?? {
      documentId,
      messages: [],
      userId,
    },
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
  const threadResult = getAiChatThreadForUser(state, body.userId, documentId);

  if (!threadResult.ok) {
    return NextResponse.json({ error: threadResult.error }, { status: 403 });
  }

  const requestMessages = body.messages;
  const incomingMessage = withChatMetadata(requestMessages[requestMessages.length - 1], {
    modelKey,
    modelName: modelConfig.name,
    selection: body.selection ?? null,
  });
  const messages = [...requestMessages.slice(0, -1), incomingMessage];
  const saveUserMessageResult = saveAiChatThreadMessages(
    state,
    body.userId,
    documentId,
    messages,
  );

  if (!saveUserMessageResult.ok) {
    return NextResponse.json({ error: saveUserMessageResult.error }, { status: 403 });
  }

  await writeStoredState(saveUserMessageResult.state);

  const result = streamText({
    messages: await convertToModelMessages(messages),
    model: createAiChatModel(modelConfig),
    system: buildDocumentChatSystemPrompt(body.documentText ?? "", body.selection ?? null),
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
          }
        : undefined,
    onFinish: async ({ messages: finishedMessages }) => {
      const latestState = await readStoredState();
      const saveResult = saveAiChatThreadMessages(
        latestState,
        body.userId ?? "",
        documentId,
        finishedMessages,
      );

      if (saveResult.ok) {
        await writeStoredState(saveResult.state);
      }
    },
    originalMessages: messages,
    sendReasoning: false,
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

function buildDocumentChatSystemPrompt(documentText: string, selection: AiChatSelection | null) {
  const cleanDocumentText = documentText.trim() || "(empty document)";
  const selectionText = selection?.text.trim();

  return [
    "You are Syncdown's document assistant.",
    "You can help the user discuss, rewrite, summarize, expand, translate, and structure the current document.",
    "When the user asks for an edit, return content that can be inserted into the document directly.",
    "Use Markdown when lists, headings, or emphasis make the answer clearer.",
    "Do not claim to have changed the document yourself; the user applies your response with explicit buttons.",
    "",
    "Current document plain text:",
    cleanDocumentText,
    selectionText ? "\nCurrent selected text:\n" + selectionText : "",
  ].join("\n");
}
