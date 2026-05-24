"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  AiChatMessage,
  AiChatModelKey,
  AiChatThread,
} from "@/features/app-state/types";

type AiModelOption = {
  key: AiChatModelKey;
  name: string;
};

type AiChatPayload = {
  models?: AiModelOption[];
  thread?: { id: string | null; messages?: AiChatMessage[] };
  threads?: AiChatThread[];
};

type UseAiChatThreadsArgs = {
  busy: boolean;
  currentUserId: string | null | undefined;
  documentId: string;
  messages: AiChatMessage[];
  setMessages: (messages: AiChatMessage[]) => void;
  stop: () => void;
};

export function useAiChatThreads({
  busy,
  currentUserId,
  documentId,
  messages,
  setMessages,
  stop,
}: UseAiChatThreadsArgs) {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [models, setModels] = useState<AiModelOption[]>([]);
  const [threads, setThreads] = useState<AiChatThread[]>([]);
  const visibleThreads = useMemo(() => {
    if (!currentUserId || !activeThreadId) {
      return threads;
    }

    return syncAiChatThreadMessages(
      threads,
      activeThreadId,
      currentUserId,
      documentId,
      messages,
    );
  }, [activeThreadId, currentUserId, documentId, messages, threads]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let ignore = false;

    fetch(`/api/ai/chat/${documentId}?userId=${encodeURIComponent(currentUserId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: AiChatPayload | null) => {
        if (ignore || !payload) {
          return;
        }

        setModels(payload.models ?? []);
        setThreads(payload.threads ?? []);
        setActiveThreadId(payload.thread?.id ?? null);
        setMessages(payload.thread?.messages ?? []);
      })
      .catch(() => {
        if (!ignore) {
          setModels([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, [currentUserId, documentId, setMessages]);

  function createThreadForSend() {
    const threadId = activeThreadId ?? createAiChatThreadId();

    setActiveThreadId(threadId);
    ensureThreadVisible(threadId, currentUserId ?? "", documentId, setThreads);

    return threadId;
  }

  function handleNewThread() {
    stop();
    setActiveThreadId(createAiChatThreadId());
    setMessages([]);
  }

  function handleSelectThread(threadId: string) {
    if (!currentUserId || busy) {
      return;
    }

    const localThread = visibleThreads.find((thread) => thread.id === threadId);

    setActiveThreadId(threadId);
    setMessages(localThread?.messages ?? []);

    fetch(
      `/api/ai/chat/${documentId}?userId=${encodeURIComponent(currentUserId)}&threadId=${encodeURIComponent(threadId)}`,
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: AiChatPayload | null) => {
        if (!payload) {
          return;
        }

        setModels(payload.models ?? []);
        setThreads(payload.threads ?? []);
        setMessages(payload.thread?.messages ?? []);
      })
      .catch(() => undefined);
  }

  function handleDeleteThread(threadId: string) {
    if (!currentUserId || busy) {
      return;
    }

    const nextLocalThreads = visibleThreads.filter((thread) => thread.id !== threadId);
    const nextActiveThread =
      threadId === activeThreadId
        ? nextLocalThreads[0] ?? null
        : visibleThreads.find((thread) => thread.id === activeThreadId) ?? null;

    setThreads(nextLocalThreads);
    setActiveThreadId(nextActiveThread?.id ?? null);

    if (threadId === activeThreadId) {
      setMessages(nextActiveThread?.messages ?? []);
    }

    fetch(
      `/api/ai/chat/${documentId}?userId=${encodeURIComponent(currentUserId)}&threadId=${encodeURIComponent(threadId)}`,
      { method: "DELETE" },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: AiChatPayload | null) => {
        if (!payload) {
          return;
        }

        setThreads(payload.threads ?? []);

        if (threadId !== activeThreadId) {
          return;
        }

        setActiveThreadId(payload.thread?.id ?? null);
        setMessages(payload.thread?.messages ?? []);
      })
      .catch(() => undefined);
  }

  return {
    activeThreadId,
    createThreadForSend,
    handleDeleteThread,
    handleNewThread,
    handleSelectThread,
    models,
    threads: visibleThreads,
  };
}

function createAiChatThreadId() {
  return `ai_chat_${crypto.randomUUID()}`;
}

function ensureThreadVisible(
  threadId: string,
  userId: string,
  documentId: string,
  setThreads: Dispatch<SetStateAction<AiChatThread[]>>,
) {
  setThreads((currentThreads) => {
    if (currentThreads.some((thread) => thread.id === threadId)) {
      return currentThreads;
    }

    return [
      {
        createdAt: new Date().toISOString(),
        documentId,
        id: threadId,
        messages: [],
        updatedAt: new Date().toISOString(),
        userId,
      },
      ...currentThreads,
    ];
  });
}

export function syncAiChatThreadMessages(
  currentThreads: AiChatThread[],
  threadId: string,
  userId: string,
  documentId: string,
  messages: AiChatMessage[],
) {
  const existingThread =
    currentThreads.find(
      (thread) =>
        thread.id === threadId &&
        thread.userId === userId &&
        thread.documentId === documentId,
    ) ?? null;

  if (!existingThread && messages.length === 0) {
    return currentThreads;
  }

  if (existingThread && JSON.stringify(existingThread.messages) === JSON.stringify(messages)) {
    return currentThreads;
  }

  const editedAt = new Date().toISOString();
  const nextThread: AiChatThread = {
    id: threadId,
    documentId,
    userId,
    messages,
    createdAt: existingThread?.createdAt ?? editedAt,
    updatedAt: editedAt,
  };

  return [
    nextThread,
    ...currentThreads.filter((thread) => thread.id !== threadId),
  ].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}
