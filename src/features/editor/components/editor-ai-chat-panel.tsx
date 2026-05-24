"use client";

import type { Editor } from "@tiptap/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  type PointerEvent,
  type RefObject,
  useCallback,
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
  AiChatDocumentAction,
  AiChatMessage,
  AiChatModelKey,
  User,
} from "@/features/app-state/types";
import { ChatMessage } from "@/features/editor/components/editor-ai-chat-message";
import { EditorAiChatPanelHeader } from "@/features/editor/components/editor-ai-chat-panel-header";
import {
  type AiDocumentApplyFailureReason,
  useAiChatAutoDocumentAction,
} from "@/features/editor/hooks/use-ai-chat-auto-document-action";
import { useAiChatThreads } from "@/features/editor/hooks/use-ai-chat-threads";
import {
  type AiChatClarification,
  type AiChatClarificationKind,
  inferAiChatClarification,
  inferAiChatDocumentAction,
  inferAiChatResponseMode,
  isAiChatClarificationCancelPrompt,
  resolveAiChatClarifiedPrompt,
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
  const [appliedNotices, setAppliedNotices] = useState<Record<string, string>>({});
  const [modelKey, setModelKey] = useState<AiChatModelKey>(() => readStoredAiChatModelKey());
  const [editingQuestion, setEditingQuestion] = useState<EditingQuestion | null>(null);
  const [pendingClarification, setPendingClarification] =
    useState<AiChatClarification | null>(null);
  const [visibleMessageCount, setVisibleMessageCount] = useState(initialVisibleMessageCount);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
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
  const busy = status === "submitted" || status === "streaming";
  const hiddenMessageCount = Math.max(0, messages.length - visibleMessageCount);
  const visibleMessages =
    hiddenMessageCount > 0 ? messages.slice(hiddenMessageCount) : messages;

  const handleDocumentActionApplied = useCallback(
    (action: AiChatDocumentAction, messageId: string, summary?: string) => {
      setAppliedNotices((current) => ({
        ...current,
        [messageId]: getAppliedNotice(action, t, summary),
      }));
      focusPromptInput(inputRef);
    },
    [t],
  );
  const handleDocumentActionApplyFailed = useCallback(
    (messageId: string, summary?: string, reason?: AiDocumentApplyFailureReason) => {
      setAppliedNotices((current) => ({
        ...current,
        [messageId]: getApplyFailedNotice(t, summary, reason),
      }));
      focusPromptInput(inputRef);
    },
    [t],
  );
  const handleDocumentActionCancelled = useCallback(
    (messageId: string) => {
      setAppliedNotices((current) => ({
        ...current,
        [messageId]: t("aiApplyCancelled"),
      }));
      focusPromptInput(inputRef);
    },
    [t],
  );
  const {
    cancelPendingAction,
    confirmPendingAction,
    pendingConfirmation,
    setPendingAction,
  } = useAiChatAutoDocumentAction({
    busy,
    editor,
    error,
    messages,
    onApplied: handleDocumentActionApplied,
    onCancelled: handleDocumentActionCancelled,
    onApplyFailed: handleDocumentActionApplyFailed,
  });
  const {
    activeThreadId,
    createThreadForSend,
    handleDeleteThread,
    handleNewThread,
    handleSelectThread,
    models,
    threads,
  } = useAiChatThreads({
    busy,
    currentUserId: currentUser?.id,
    documentId,
    setMessages,
    stop,
  });

  function handleSubmit({ text }: { text: string }) {
    const trimmed = text.trim();

    if (!trimmed || busy || !currentUser?.id) {
      return;
    }

    const selected = hasEditorSelection(editor);
    const hasRecentDocumentAction = hasRecentAiDocumentAction(messages);
    const resolvedPrompt =
      pendingClarification && !isAiChatClarificationCancelPrompt(trimmed)
        ? resolveAiChatClarifiedPrompt(pendingClarification, trimmed)
        : trimmed;

    if (pendingClarification && isAiChatClarificationCancelPrompt(trimmed)) {
      setPendingClarification(null);
      setInput("");
      focusPromptInput(inputRef);
      return;
    }

    if (!pendingClarification) {
      const clarification = inferAiChatClarification(trimmed, {
        hasRecentAssistantAnswer: hasRecentSubstantiveAssistantAnswer(messages),
        hasRecentDocumentAction,
        hasSelection: selected,
      });

      if (clarification) {
        const threadId = createThreadForSend();
        const nextMessages = [
          ...messages,
          createLocalAiChatTextMessage("user", trimmed, threadId),
          createLocalAiChatTextMessage(
            "assistant",
            getClarificationQuestion(clarification.kind, t),
            threadId,
            clarification.kind,
          ),
        ];

        setPendingClarification(clarification);
        setMessages(nextMessages);
        setInput("");
        focusPromptInput(inputRef);
        return;
      }
    }

    const documentAction = inferAiChatDocumentAction(resolvedPrompt, {
      hasSelection: selected,
      hasRecentDocumentAction,
    });
    const responseMode = inferAiChatResponseMode(resolvedPrompt);
    const threadId = createThreadForSend();

    setPendingClarification(null);
    setPendingAction(documentAction, messages.length);
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
          documentAction,
          responseMode,
          threadId,
          getOrderedApplicationStatusNotices(messages, appliedNotices),
          resolvedPrompt === trimmed ? undefined : resolvedPrompt,
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

    if (!editingQuestion || !trimmed || busy || !currentUser?.id) {
      return;
    }

    const threadId = createThreadForSend();
    const editedIndex = messages.findIndex((message) => message.id === editingQuestion.id);
    const nextMessages = editedIndex >= 0 ? messages.slice(0, editedIndex) : messages;
    const documentAction = inferAiChatDocumentAction(trimmed, {
      hasSelection: hasEditorSelection(editor),
      hasRecentDocumentAction: hasRecentAiDocumentAction(nextMessages),
    });
    const responseMode = inferAiChatResponseMode(trimmed);

    setPendingAction(documentAction, nextMessages.length);
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
          documentAction,
          responseMode,
          threadId,
          getOrderedApplicationStatusNotices(nextMessages, appliedNotices),
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
          setPendingClarification(null);
          setVisibleMessageCount(initialVisibleMessageCount);
          handleNewThread();
        }}
        onResizeStart={onResizeStart}
        onSelectThread={(threadId) => {
          setAppliedNotices({});
          setEditingQuestion(null);
          setPendingClarification(null);
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
                    busy={busy}
                    editingText={
                      editingQuestion?.id === message.id ? editingQuestion.text : undefined
                    }
                    isEditing={editingQuestion?.id === message.id}
                    key={message.id}
                    message={message}
                    onCancelEdit={handleCancelEditQuestion}
                    onCancelDocumentAction={() => cancelPendingAction(message.id)}
                    onConfirmDocumentAction={() => confirmPendingAction(message.id)}
                    onEdit={handleEditQuestion}
                    onEditingTextChange={handleEditingQuestionTextChange}
                    onRegenerate={() =>
                      void regenerate({
                        body: getAiChatRequestBody(
                          editor,
                          modelKey,
                          currentUser?.id ?? "",
                          documentTitle,
                          null,
                          message.metadata?.responseMode ?? null,
                          activeThreadId,
                          getOrderedApplicationStatusNotices(messages, appliedNotices),
                        ),
                        messageId: message.id,
                      })
                    }
                    onSendEdit={handleSendEditedQuestion}
                    onStop={() => void stop()}
                    pendingDocumentAction={
                      pendingConfirmation?.messageId === message.id
                        ? pendingConfirmation
                        : null
                    }
                    showStopAction={isStreamingAssistant}
                  />
                );
              })}
            </div>
          )}
          {error ? (
            <p className="mt-3 text-xs text-[#dd5b00]">{t("aiRequestFailed")}</p>
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
          <PromptInputSubmit disabled={busy || !input.trim()} />
        </div>
      </PromptInput>
    </aside>
  );
}

function hasEditorSelection(editor: Editor | null) {
  return Boolean(editor && !editor.state.selection.empty);
}

function hasRecentAiDocumentAction(messages: AiChatMessage[]) {
  const recentMessages = messages.slice(-8);

  for (let index = recentMessages.length - 1; index >= 0; index -= 1) {
    const message = recentMessages[index];

    if (message?.metadata?.documentAction) {
      return true;
    }
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message?.role === "assistant") {
      return Boolean(message.metadata?.documentAction);
    }
  }

  return false;
}

function hasRecentSubstantiveAssistantAnswer(messages: AiChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message?.role !== "assistant") {
      continue;
    }

    if (message.metadata?.documentAction || message.metadata?.clarificationKind) {
      continue;
    }

    return getPlainTextFromAiChatMessage(message).trim().length > 0;
  }

  return false;
}

function createLocalAiChatTextMessage(
  role: "assistant" | "user",
  text: string,
  threadId: string,
  clarificationKind?: AiChatClarificationKind,
): AiChatMessage {
  return {
    id: `ai_local_${crypto.randomUUID()}`,
    metadata: {
      clarificationKind,
      createdAt: new Date().toISOString(),
      threadId,
    },
    parts: [{ text, type: "text" }],
    role,
  };
}

function getPlainTextFromAiChatMessage(message: AiChatMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

function getClarificationQuestion(
  kind: AiChatClarificationKind,
  t: (key: MessageKey) => string,
) {
  if (kind === "missing_insert_source") {
    return t("aiClarifyInsertSource");
  }

  return t("aiClarifyDocumentTarget");
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

function getAppliedNotice(
  action: AiChatDocumentAction,
  t: (key: MessageKey) => string,
  summary?: string,
) {
  const trimmedSummary = summary?.trim();

  if (trimmedSummary) {
    return `${t("aiAppliedPrefix")}${trimmedSummary}`;
  }

  if (action === "edit_blocks") {
    return t("aiAppliedBlockEdit");
  }

  if (action === "insert_end") {
    return t("aiAppliedInsertEnd");
  }

  if (action === "insert_cursor") {
    return t("aiAppliedInsertCursor");
  }

  if (action === "replace_selection") {
    return t("aiAppliedReplaceSelection");
  }

  return t("aiAppliedReplaceDocument");
}

function getApplyFailedNotice(
  t: (key: MessageKey) => string,
  summary?: string,
  reason?: AiDocumentApplyFailureReason,
) {
  if (reason === "verification_failed") {
    return t("aiApplyVerificationFailed");
  }

  const trimmedSummary = summary?.trim();

  if (!trimmedSummary) {
    return t("aiApplyFailed");
  }

  if (/^(未修改文档|Document was not changed)/i.test(trimmedSummary)) {
    return trimmedSummary;
  }

  return `${t("aiNotChangedPrefix")}${trimmedSummary}`;
}
