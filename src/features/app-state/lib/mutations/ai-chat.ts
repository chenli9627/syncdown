import type {
  AiChatMessage,
  AiChatThread,
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
  threadId?: string | null,
) {
  const permission = canUseAiChat(state, userId, documentId);

  if (!permission.ok) {
    return permission;
  }

  const threads = getUserDocumentThreads(state, userId, documentId);

  return {
    ok: true as const,
    thread: threadId
      ? threads.find((thread) => thread.id === threadId) ?? null
      : threads[0] ?? null,
  };
}

export function getAiChatThreadsForUser(
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
    threads: getUserDocumentThreads(state, userId, documentId),
  };
}

export function saveAiChatThreadMessages(
  state: StoredSyntextState,
  userId: string,
  documentId: string,
  messages: AiChatMessage[],
  options?: { threadId?: string | null },
) {
  const permission = canUseAiChat(state, userId, documentId);

  if (!permission.ok) {
    return permission;
  }

  const editedAt = now();
  const currentThreads = state.aiChatThreads ?? [];
  const requestedThreadId = options?.threadId?.trim();
  const existingThread = requestedThreadId
    ? currentThreads.find(
        (thread) =>
          thread.id === requestedThreadId &&
          thread.userId === userId &&
          thread.documentId === documentId,
      ) ?? null
    : getUserDocumentThreads(state, userId, documentId)[0] ?? null;
  const threadId = existingThread?.id ?? requestedThreadId ?? `ai_chat_${crypto.randomUUID()}`;
  const nextThread = {
    id: threadId,
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
          (thread) => thread.id !== threadId,
        ),
        nextThread,
      ],
    },
    thread: nextThread,
  };
}

export function deleteAiChatThreadForUser(
  state: StoredSyntextState,
  userId: string,
  documentId: string,
  threadId: string,
) {
  const permission = canUseAiChat(state, userId, documentId);

  if (!permission.ok) {
    return permission;
  }

  const currentThreads = state.aiChatThreads ?? [];
  const nextState = {
    ...state,
    aiChatThreads: currentThreads.filter(
      (thread) =>
        !(
          thread.id === threadId &&
          thread.userId === userId &&
          thread.documentId === documentId
        ),
    ),
  };

  return {
    ok: true as const,
    state: nextState,
    threads: getUserDocumentThreads(nextState, userId, documentId),
  };
}

function getUserDocumentThreads(
  state: StoredSyntextState,
  userId: string,
  documentId: string,
): AiChatThread[] {
  return (state.aiChatThreads ?? [])
    .filter((thread) => thread.userId === userId && thread.documentId === documentId)
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}
