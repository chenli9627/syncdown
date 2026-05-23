"use client";

import type { Editor } from "@tiptap/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  type PointerEvent,
  useEffect,
  useMemo,
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
import { useAiChatAutoDocumentAction } from "@/features/editor/hooks/use-ai-chat-auto-document-action";
import { inferAiChatDocumentAction } from "@/features/editor/lib/ai-chat-actions";
import {
  AI_CHAT_MODEL_STORAGE_KEY,
  getAiChatRequestBody,
  readStoredAiChatModelKey,
} from "@/features/editor/lib/ai-chat-request";
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
  const [modelKey, setModelKey] = useState<AiChatModelKey>(() => readStoredAiChatModelKey());
  const [models, setModels] = useState<AiModelOption[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<EditingQuestion | null>(null);
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
  const { setPendingAction } = useAiChatAutoDocumentAction({
    busy,
    editor,
    error,
    messages,
  });

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

    const documentAction = inferAiChatDocumentAction(trimmed);

    setPendingAction(documentAction);
    setInput("");
    void sendMessage(
      { text: trimmed },
      {
        body: getAiChatRequestBody(
          editor,
          modelKey,
          currentUser.id,
          documentTitle,
          documentAction,
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

    const documentAction = inferAiChatDocumentAction(trimmed);
    const editedIndex = messages.findIndex((message) => message.id === editingQuestion.id);
    const nextMessages = editedIndex >= 0 ? messages.slice(0, editedIndex) : messages;

    setPendingAction(documentAction);
    flushSync(() => {
      setMessages(nextMessages);
      setEditingQuestion(null);
    });
    void sendMessage(
      { text: trimmed },
      {
        body: getAiChatRequestBody(
          editor,
          modelKey,
          currentUser.id,
          documentTitle,
          documentAction,
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
        activeModelName={activeModelName}
        isNarrow={isNarrow}
        modelKey={modelKey}
        models={models}
        onClose={onClose}
        onModelChange={handleModelChange}
        onResizeStart={onResizeStart}
      />
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState>{t("aiChatEmpty")}</ConversationEmptyState>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((message) => (
                <ChatMessage
                  busy={busy}
                  editingText={
                    editingQuestion?.id === message.id ? editingQuestion.text : undefined
                  }
                  editor={editor}
                  isEditing={editingQuestion?.id === message.id}
                  key={message.id}
                  message={message}
                  onCancelEdit={handleCancelEditQuestion}
                  onEdit={handleEditQuestion}
                  onEditingTextChange={handleEditingQuestionTextChange}
                  onRegenerate={() =>
                    void regenerate({
                      body: getAiChatRequestBody(
                        editor,
                        modelKey,
                        currentUser?.id ?? "",
                        documentTitle,
                      ),
                      messageId: message.id,
                    })
                  }
                  onSendEdit={handleSendEditedQuestion}
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
            value={input}
          />
          <PromptInputSubmit disabled={busy || !input.trim()} />
        </div>
      </PromptInput>
    </aside>
  );
}
