import type {
  AiChatMessage,
  StoredSyntextState,
} from "@/features/app-state/types";
import {
  canOpenDocument,
  getDocumentById,
  getDocumentPermissionForUser,
  now,
} from "@/features/app-state/lib/mutations/shared";

function canUseAiChat(state: StoredSyntextState, userId: string, documentId: string) {
  const document = getDocumentById(state, documentId);

  if (!document || !canOpenDocument(state, userId, document)) {
    return { ok: false as const, error: "You do not have access to this document" };
  }

  const permission = getDocumentPermissionForUser(state, userId, document);

  if (permission !== "owner" && permission !== "can_edit") {
    return { ok: false as const, error: "You do not have permission to use AI chat" };
  }

  return { ok: true as const };
}

export function getAiChatThreadForUser(
  state: StoredSyntextState,
  userId: string,
  documentId: string,
) {
  const permission = canUseAiChat(state, userId, documentId);

  if (!permission.ok) {
    return permission;
  }

  return {
    ok: true as const,
    thread:
      state.aiChatThreads?.find(
        (thread) => thread.userId === userId && thread.documentId === documentId,
      ) ?? null,
  };
}

export function saveAiChatThreadMessages(
  state: StoredSyntextState,
  userId: string,
  documentId: string,
  messages: AiChatMessage[],
) {
  const permission = canUseAiChat(state, userId, documentId);

  if (!permission.ok) {
    return permission;
  }

  const editedAt = now();
  const currentThreads = state.aiChatThreads ?? [];
  const existingThread =
    currentThreads.find(
      (thread) => thread.userId === userId && thread.documentId === documentId,
    ) ?? null;
  const nextThread = {
    id: existingThread?.id ?? `ai_chat_${crypto.randomUUID()}`,
    documentId,
    userId,
    messages,
    createdAt: existingThread?.createdAt ?? editedAt,
    updatedAt: editedAt,
  };

  return {
    ok: true as const,
    state: {
      ...state,
      aiChatThreads: [
        ...currentThreads.filter(
          (thread) => !(thread.userId === userId && thread.documentId === documentId),
        ),
        nextThread,
      ],
    },
    thread: nextThread,
  };
}
