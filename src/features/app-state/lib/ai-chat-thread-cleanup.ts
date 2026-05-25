import type {
  AiChatMessage,
  AiChatMessageMetadata,
  AiChatThread,
  StoredSyntextState,
} from "@/features/app-state/types";
import { parseAiDocumentEditPlan } from "@/features/editor/lib/ai-chat-document-edit-plan";
import { sanitizeAiAssistantText } from "@/features/editor/lib/ai-chat-output-guard";

export function normalizeAiChatThreads(threads: AiChatThread[]) {
  let changed = false;
  const nextThreads = threads.map((thread) => {
    const nextMessages = thread.messages.map((message) => {
      const normalizedMessage = normalizeAiChatMessage(message);

      if (normalizedMessage !== message) {
        changed = true;
      }

      return normalizedMessage;
    });

    return nextMessages === thread.messages ? thread : { ...thread, messages: nextMessages };
  });

  return {
    changed,
    threads: changed ? nextThreads : threads,
  };
}

export function mergeNormalizedAiChatThreads(
  state: StoredSyntextState,
  normalizedThreads: AiChatThread[],
) {
  const byId = new Map(normalizedThreads.map((thread) => [thread.id, thread]));
  const currentThreads = state.aiChatThreads ?? [];

  return {
    ...state,
    aiChatThreads: currentThreads.map((thread) => byId.get(thread.id) ?? thread),
  };
}

function normalizeAiChatMessage(message: AiChatMessage) {
  if (message.role !== "assistant") {
    return stripLegacyMetadata(message);
  }

  const rawText = getMessageText(message);
  const sanitizedText = sanitizeAiAssistantText(rawText, null, message.metadata?.responseMode ?? null);
  const legacyPlan =
    message.metadata?.documentAction === "edit_blocks" || looksLikeLegacyEditPayload(sanitizedText)
      ? parseAiDocumentEditPlan(sanitizedText)
      : null;
  const visibleText = legacyPlan?.summary?.trim() || sanitizedText;
  const metadata = stripLegacyMetadataFields(message.metadata);
  const nextParts = [{ text: visibleText, type: "text" as const }];

  if (
    shallowEqualMetadata(message.metadata, metadata) &&
    hasSingleMatchingTextPart(message, visibleText)
  ) {
    return message;
  }

  return {
    ...message,
    metadata,
    parts: nextParts,
  };
}

function stripLegacyMetadata(message: AiChatMessage) {
  const metadata = stripLegacyMetadataFields(message.metadata);

  return shallowEqualMetadata(message.metadata, metadata)
    ? message
    : {
        ...message,
        metadata,
      };
}

function stripLegacyMetadataFields(metadata: AiChatMessageMetadata | undefined) {
  if (!metadata) {
    return metadata;
  }

  const { clarificationKind, documentAction, editPlan, ...rest } = metadata;
  void clarificationKind;
  void documentAction;
  void editPlan;
  return rest;
}

function hasSingleMatchingTextPart(message: AiChatMessage, text: string) {
  return (
    message.parts.length === 1 &&
    message.parts[0]?.type === "text" &&
    message.parts[0].text === text
  );
}

function getMessageText(message: AiChatMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

function looksLikeLegacyEditPayload(text: string) {
  return /^\s*\{\s*"summary"\s*:\s*".*"\s*,\s*"operations"\s*:/s.test(text);
}

function shallowEqualMetadata(
  left: AiChatMessageMetadata | undefined,
  right: AiChatMessageMetadata | undefined,
) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);

  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  return leftEntries.every(([key, value]) => right[key as keyof AiChatMessageMetadata] === value);
}
