"use client";

import type { Editor } from "@tiptap/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  type PointerEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { useLocale } from "@/components/providers/locale-provider";
import type {
  AiChatMessage,
  AiChatModelKey,
  User,
} from "@/features/app-state/types";
import { ChatMessage } from "@/features/editor/components/editor-ai-chat-message";
import { EditorAiChatPanelHeader } from "@/features/editor/components/editor-ai-chat-panel-header";
import { useAiRequestLock } from "@/features/editor/hooks/use-ai-request-lock";
import { useAiChatThreads } from "@/features/editor/hooks/use-ai-chat-threads";
import {
  getAiChatMessageText,
  inferAiChatResponseMode,
} from "@/features/editor/lib/ai-chat-actions";
import {
  AI_CHAT_MODEL_STORAGE_KEY,
  getAiChatRequestBody,
  readStoredAiChatModelKey,
} from "@/features/editor/lib/ai-chat-request";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

type AiChatPanelProps = {
  currentUser: User | null;
  documentId: string;
  documentTitle: string;
  editor: Editor | null;
  isNarrow: boolean;
  onClose: () => void;
  onResizeStart: (event: PointerEvent<HTMLDivElement>) => void;
  panelWidth: number;
};

type EditingQuestion = {
  id: string;
  text: string;
};

const initialVisibleMessageCount = 40;
const visibleMessageStep = 40;
const AI_CHAT_APPLIED_NOTICE_STORAGE_KEY = "syncdown.ai-chat.applied-notices.v1";

export function EditorAiChatPanel({
  currentUser,
  documentId,
  documentTitle,
  editor,
  isNarrow,
  onClose,
  onResizeStart,
  panelWidth,
}: AiChatPanelProps) {
  const { t } = useLocale();
  const [input, setInput] = useState("");
  const [appliedNotices, setAppliedNotices] = useState<Record<string, string>>(() =>
    readStoredAppliedNotices(),
  );
  const [modelKey, setModelKey] = useState<AiChatModelKey>(() => readStoredAiChatModelKey());
  const [editingQuestion, setEditingQuestion] = useState<EditingQuestion | null>(null);
  const [visibleMessageCount, setVisibleMessageCount] = useState(initialVisibleMessageCount);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const recoveredAssistantMessageIdsRef = useRef<Set<string>>(new Set());
  const transport = useMemo(
    () =>
      new DefaultChatTransport<AiChatMessage>({
        api: `/api/ai/chat/${documentId}`,
      }),
    [documentId],
  );
  const {
    error,
    messages,
    regenerate,
    sendMessage,
    setMessages,
    status,
    stop,
  } = useChat<AiChatMessage>({
    id: `${documentId}:${currentUser?.id ?? "anonymous"}`,
    transport,
  });
  const aiRequestLock = useAiRequestLock("chat");
  const busy = status === "submitted" || status === "streaming";
  const requestBusy = busy || aiRequestLock.isLockedByOther;
  const hiddenMessageCount = Math.max(0, messages.length - visibleMessageCount);
  const visibleMessages =
    hiddenMessageCount > 0 ? messages.slice(hiddenMessageCount) : messages;

  useEffect(() => {
    writeStoredAppliedNotices(appliedNotices);
  }, [appliedNotices]);

  useEffect(() => {
    if (!busy) {
      aiRequestLock.release();
    }
  }, [aiRequestLock, busy]);

  useEffect(() => {
    return () => {
      aiRequestLock.release();
    };
  }, [aiRequestLock]);

  const {
    activeThreadId,
    createThreadForSend,
    handleDeleteThread,
    handleNewThread,
    handleSelectThread,
    models,
    refreshActiveThread,
    threads,
  } = useAiChatThreads({
    busy,
    currentUserId: currentUser?.id,
    documentId,
    messages,
    setMessages,
    stop,
  });

  useEffect(() => {
    if (busy || !currentUser?.id || !activeThreadId || !messages.length) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const visibleText = lastMessage
      ? getAiChatMessageText(lastMessage, lastMessage.metadata?.documentAction ?? null)
      : "";

    if (
      lastMessage?.role !== "assistant" ||
      visibleText ||
      recoveredAssistantMessageIdsRef.current.has(lastMessage.id)
    ) {
      return;
    }

    recoveredAssistantMessageIdsRef.current.add(lastMessage.id);
    void refreshActiveThread(activeThreadId);
  }, [activeThreadId, busy, currentUser?.id, messages, refreshActiveThread]);

  function handleSubmit({ text }: { text: string }) {
    const trimmed = text.trim();

    if (!trimmed || requestBusy || !currentUser?.id) {
      return;
    }
    const threadId = createThreadForSend();
    const responseMode = inferAiChatResponseMode(trimmed);

    if (!aiRequestLock.acquire()) {
      return;
    }

    setInput("");
    focusPromptInput(inputRef);
    void sendMessage(
      { text: trimmed },
      {
        body: getAiChatRequestBody(
          editor,
          modelKey,
          currentUser.id,
          documentTitle,
          null,
          responseMode,
          threadId,
          getOrderedApplicationStatusNotices(messages, appliedNotices),
          undefined,
          true,
        ),
      },
    );
  }

  function handleEditQuestion(messageId: string, text: string) {
    setEditingQuestion({ id: messageId, text });
  }

  function handleCancelEditQuestion() {
    setEditingQuestion(null);
  }

  function handleEditingQuestionTextChange(value: string) {
    setEditingQuestion((current) =>
      current ? { ...current, text: value } : current,
    );
  }

  function handleSendEditedQuestion() {
    const trimmed = editingQuestion?.text.trim() ?? "";

    if (!editingQuestion || !trimmed || requestBusy || !currentUser?.id) {
      return;
    }

    const threadId = createThreadForSend();
    const editedIndex = messages.findIndex((message) => message.id === editingQuestion.id);
    const nextMessages = editedIndex >= 0 ? messages.slice(0, editedIndex) : messages;
    const responseMode = inferAiChatResponseMode(trimmed);

    if (!aiRequestLock.acquire()) {
      return;
    }

    flushSync(() => {
      setMessages(nextMessages);
      setEditingQuestion(null);
    });
    focusPromptInput(inputRef);
    void sendMessage(
      { text: trimmed },
      {
        body: getAiChatRequestBody(
          editor,
          modelKey,
          currentUser.id,
          documentTitle,
          null,
          responseMode,
          threadId,
          getOrderedApplicationStatusNotices(nextMessages, appliedNotices),
          undefined,
          true,
        ),
      },
    );
  }

  function handleModelChange(nextModelKey: AiChatModelKey) {
    setModelKey(nextModelKey);
    window.localStorage.setItem(AI_CHAT_MODEL_STORAGE_KEY, nextModelKey);
  }

  return (
    <aside
      className={cn(
        "z-30 flex min-h-0 flex-col overscroll-contain border-l border-[var(--color-border)] bg-[var(--color-editor-header-background)] shadow-sm",
        isNarrow
          ? "fixed bottom-0 right-0 top-0 w-[min(420px,100vw)]"
          : "sticky top-0 h-screen shrink-0",
      )}
      style={
        isNarrow
          ? { overscrollBehavior: "contain" }
          : { overscrollBehavior: "contain", width: panelWidth }
      }
    >
      <EditorAiChatPanelHeader
        activeThreadId={activeThreadId}
        isNarrow={isNarrow}
        modelKey={modelKey}
        models={models}
        onClose={onClose}
        onDeleteThread={handleDeleteThread}
        onModelChange={handleModelChange}
        onNewThread={() => {
          setAppliedNotices({});
          setEditingQuestion(null);
          setVisibleMessageCount(initialVisibleMessageCount);
          handleNewThread();
        }}
        onResizeStart={onResizeStart}
        onSelectThread={(threadId) => {
          setAppliedNotices({});
          setEditingQuestion(null);
          setVisibleMessageCount(initialVisibleMessageCount);
          handleSelectThread(threadId);
        }}
        threads={threads}
      />
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState>{t("aiChatEmpty")}</ConversationEmptyState>
          ) : (
            <div className="flex flex-col gap-4">
              {hiddenMessageCount > 0 ? (
                <button
                  className="mx-auto border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs text-[var(--color-muted-foreground)] shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  onClick={() =>
                    setVisibleMessageCount((current) => current + visibleMessageStep)
                  }
                  type="button"
                >
                  {t("aiShowEarlierMessages")}
                </button>
              ) : null}
              {visibleMessages.map((message, index) => {
                const isStreamingAssistant =
                  busy &&
                  index === visibleMessages.length - 1 &&
                  message.role === "assistant";

                return (
                  <ChatMessage
                    appliedNotice={appliedNotices[message.id]}
                    busy={requestBusy}
                    editingText={
                      editingQuestion?.id === message.id ? editingQuestion.text : undefined
                    }
                    isEditing={editingQuestion?.id === message.id}
                    key={message.id}
                    message={message}
                    onCancelEdit={handleCancelEditQuestion}
                    onCancelDocumentAction={() => {}}
                    onConfirmDocumentAction={() => {}}
                    onEdit={handleEditQuestion}
                    onEditingTextChange={handleEditingQuestionTextChange}
                    onRegenerate={() =>
                      void (aiRequestLock.acquire()
                        ? regenerate({
                            body: getAiChatRequestBody(
                              editor,
                              modelKey,
                              currentUser?.id ?? "",
                              documentTitle,
                              null,
                              message.metadata?.responseMode ?? null,
                              activeThreadId,
                              getOrderedApplicationStatusNotices(messages, appliedNotices),
                              undefined,
                              true,
                            ),
                            messageId: message.id,
                          })
                        : Promise.resolve())
                    }
                    onSendEdit={handleSendEditedQuestion}
                    onStop={() => void stop()}
                    pendingDocumentAction={null}
                    showStopAction={isStreamingAssistant}
                  />
                );
              })}
            </div>
          )}
          {error ? (
            <p className="mt-3 text-xs text-[#dd5b00]">
              {getAiRequestErrorText(error, t)}
            </p>
          ) : null}
        </ConversationContent>
      </Conversation>
      <PromptInput onSubmit={handleSubmit} text={input}>
        <div className="flex items-end gap-2">
          <PromptInputTextarea
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("aiChatPlaceholder")}
            ref={inputRef}
            value={input}
          />
          <PromptInputSubmit disabled={requestBusy || !input.trim()} />
        </div>
      </PromptInput>
    </aside>
  );
}

function focusPromptInput(inputRef: RefObject<HTMLTextAreaElement | null>) {
  window.requestAnimationFrame(() => {
    inputRef.current?.focus();
  });
}

function getOrderedApplicationStatusNotices(
  messages: AiChatMessage[],
  appliedNotices: Record<string, string>,
) {
  return messages
    .map((message) => appliedNotices[message.id])
    .filter((notice): notice is string => Boolean(notice));
}

function readStoredAppliedNotices() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(AI_CHAT_APPLIED_NOTICE_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([messageId, notice]) => typeof messageId === "string" && typeof notice === "string",
      ),
    );
  } catch {
    return {};
  }
}

function writeStoredAppliedNotices(appliedNotices: Record<string, string>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      AI_CHAT_APPLIED_NOTICE_STORAGE_KEY,
      JSON.stringify(appliedNotices),
    );
  } catch {
    // ignore storage failures
  }
}

function getAiRequestErrorText(
  error: Error,
  t: (key: MessageKey) => string,
) {
  const message = error.message.trim();

  if (!message) {
    return t("aiRequestFailed");
  }

  if (message === t("aiRequestFailed")) {
    return message;
  }

  return `${t("aiRequestFailed")} ${message}`;
}
