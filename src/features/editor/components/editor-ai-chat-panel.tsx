"use client";

import type { Editor } from "@tiptap/react";
import { useChat } from "@ai-sdk/react";
import { Bot, PanelRightClose, Send } from "lucide-react";
import { DefaultChatTransport } from "ai";
import {
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  AiChatSelection,
  User,
} from "@/features/app-state/types";
import { ChatMessage } from "@/features/editor/components/editor-ai-chat-message";
import { EditorAiModelSelect } from "@/features/editor/components/editor-ai-model-select";
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

type AiModelOption = {
  key: AiChatModelKey;
  name: string;
};

type EditingQuestion = {
  id: string;
  text: string;
};

const AI_CHAT_MODEL_STORAGE_KEY = "syncdown.aiChatModelKey";

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
  const [modelKey, setModelKey] = useState<AiChatModelKey>(() => readStoredModelKey());
  const [models, setModels] = useState<AiModelOption[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<EditingQuestion | null>(null);
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
  const activeModelName =
    models.find((model) => model.key === modelKey)?.name ??
    (modelKey === "primary" ? "Primary model" : "Secondary model");

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    let ignore = false;

    fetch(`/api/ai/chat/${documentId}?userId=${encodeURIComponent(currentUser.id)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { models?: AiModelOption[]; thread?: { messages?: AiChatMessage[] } } | null) => {
        if (ignore || !payload) {
          return;
        }

        setModels(payload.models ?? []);
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
  }, [currentUser?.id, documentId, setMessages]);

  function handleSubmit({ text }: { text: string }) {
    const trimmed = text.trim();

    if (!trimmed || busy || !currentUser?.id) {
      return;
    }

    setInput("");
    void sendMessage(
      { text: trimmed },
      { body: getChatRequestBody(editor, modelKey, currentUser.id, documentTitle) },
    );
  }

  function handleEditQuestion(messageId: string, text: string) {
    setEditingQuestion({ id: messageId, text });
  }

  function handleCancelEditQuestion() {
    setEditingQuestion(null);
  }

  function handleSendEditedQuestion() {
    const trimmed = editingQuestion?.text.trim() ?? "";

    if (!editingQuestion || !trimmed || busy || !currentUser?.id) {
      return;
    }

    const editedIndex = messages.findIndex((message) => message.id === editingQuestion.id);
    const nextMessages = editedIndex >= 0 ? messages.slice(0, editedIndex) : messages;

    setMessages(nextMessages);
    setEditingQuestion(null);
    window.setTimeout(() => {
      void sendMessage(
        { text: trimmed },
        { body: getChatRequestBody(editor, modelKey, currentUser.id, documentTitle) },
      );
    }, 0);
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
      {!isNarrow ? (
        <div
          className="absolute bottom-0 left-0 top-0 w-1 cursor-col-resize hover:bg-[var(--color-accent)]"
          onPointerDown={onResizeStart}
        />
      ) : null}
      <div className="flex h-13 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
            <Bot aria-hidden="true" size={16} />
            {t("aiChatTitle")}
          </p>
          <p className="truncate text-[11px] text-[var(--color-muted-foreground)]">
            {t("aiModel")}: {activeModelName}
          </p>
        </div>
        <button
          className="inline-flex h-8 w-8 items-center justify-center text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          onClick={onClose}
          title={t("closeAiChat")}
          type="button"
        >
          <PanelRightClose aria-hidden="true" size={16} />
        </button>
      </div>
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2">
        <label className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
          {t("aiModel")}
        </label>
        <EditorAiModelSelect models={models} onChange={handleModelChange} value={modelKey} />
      </div>
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState>
              {t("aiChatEmpty")}
            </ConversationEmptyState>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((message) => (
                <ChatMessage
                  editor={editor}
                  key={message.id}
                  message={message}
                  onEdit={handleEditQuestion}
                  onRegenerate={() =>
                    void regenerate({
                      body: getChatRequestBody(
                        editor,
                        modelKey,
                        currentUser?.id ?? "",
                        documentTitle,
                      ),
                      messageId: message.id,
                    })
                  }
                />
              ))}
            </div>
          )}
          {busy ? (
            <button
              className="mt-4 border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
              onClick={() => void stop()}
              type="button"
            >
              {t("aiStop")}
            </button>
          ) : null}
          {error ? (
            <p className="mt-3 text-xs text-[#dd5b00]">{t("aiRequestFailed")}</p>
          ) : null}
        </ConversationContent>
      </Conversation>
      <PromptInput onSubmit={handleSubmit} text={input}>
        <div className="flex items-end gap-2">
          <PromptInputTextarea
            disabled={busy}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("aiChatPlaceholder")}
            ref={inputRef}
            value={input}
          />
          <PromptInputSubmit disabled={busy || !input.trim()} />
        </div>
      </PromptInput>
      {editingQuestion ? (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-[rgba(0,0,0,0.08)] px-4 py-20">
          <form
            className="w-full max-w-[360px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft-card)]"
            onSubmit={(event) => {
              event.preventDefault();
              handleSendEditedQuestion();
            }}
          >
            <div className="relative">
              <textarea
                className="min-h-28 w-full resize-none bg-[var(--color-surface)] px-3 pb-12 pt-3 text-sm leading-5 text-[var(--color-foreground)] outline-none"
                onChange={(event) =>
                  setEditingQuestion((current) =>
                    current ? { ...current, text: event.target.value } : current,
                  )
                }
                placeholder={t("aiEditQuestionPlaceholder")}
                value={editingQuestion.text}
              />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                  className="h-7 border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  onClick={handleCancelEditQuestion}
                  type="button"
                >
                  {t("cancel")}
                </button>
                <button
                  className="inline-flex h-7 items-center gap-1 border border-[var(--color-primary)] bg-[var(--color-primary)] px-2.5 text-xs font-medium text-[var(--color-primary-foreground)] hover:brightness-95 disabled:opacity-50"
                  disabled={busy || !editingQuestion.text.trim()}
                  type="submit"
                >
                  <Send aria-hidden="true" size={13} />
                  {t("aiSend")}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </aside>
  );
}

function readStoredModelKey(): AiChatModelKey {
  if (typeof window === "undefined") {
    return "primary";
  }

  const storedModel = window.localStorage.getItem(AI_CHAT_MODEL_STORAGE_KEY);

  return storedModel === "secondary" ? "secondary" : "primary";
}

function getCurrentSelection(editor: Editor | null): AiChatSelection | null {
  if (!editor || editor.state.selection.empty) {
    return null;
  }

  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to, "\n").trim();

  return text ? { from, text, to } : null;
}

function getChatRequestBody(
  editor: Editor | null,
  modelKey: AiChatModelKey,
  userId: string,
  documentTitle: string,
) {
  return {
    documentText: editor?.getText() ?? "",
    documentTitle,
    modelKey,
    selection: getCurrentSelection(editor),
    userId,
  };
}
