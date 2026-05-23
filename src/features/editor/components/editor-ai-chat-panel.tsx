"use client";

import type { Editor } from "@tiptap/react";
import { useChat } from "@ai-sdk/react";
import { Bot, PanelRightClose } from "lucide-react";
import { DefaultChatTransport } from "ai";
import {
  type PointerEvent,
  useEffect,
  useMemo,
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
import type {
  AiChatMessage,
  AiChatModelKey,
  AiChatSelection,
  User,
} from "@/features/app-state/types";
import { ChatMessage } from "@/features/editor/components/editor-ai-chat-message";
import { cn } from "@/lib/utils";

type AiChatPanelProps = {
  currentUser: User | null;
  documentId: string;
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

export function EditorAiChatPanel({
  currentUser,
  documentId,
  editor,
  isNarrow,
  onClose,
  onResizeStart,
  panelWidth,
}: AiChatPanelProps) {
  const [input, setInput] = useState("");
  const [modelKey, setModelKey] = useState<AiChatModelKey>("primary");
  const [models, setModels] = useState<AiModelOption[]>([]);
  const [discardedIds, setDiscardedIds] = useState<Set<string>>(() => new Set());
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
      { body: getChatRequestBody(editor, modelKey, currentUser.id) },
    );
  }

  return (
    <aside
      className={cn(
        "z-30 flex min-h-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-editor-header-background)] shadow-sm",
        isNarrow
          ? "fixed bottom-0 right-0 top-0 w-[min(420px,100vw)]"
          : "sticky top-0 h-screen shrink-0",
      )}
      style={isNarrow ? undefined : { width: panelWidth }}
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
            AI Chat
          </p>
          <p className="truncate text-[11px] text-[var(--color-muted-foreground)]">
            AI Model: {activeModelName}
          </p>
        </div>
        <button
          className="inline-flex h-8 w-8 items-center justify-center text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          onClick={onClose}
          title="Close AI chat"
          type="button"
        >
          <PanelRightClose aria-hidden="true" size={16} />
        </button>
      </div>
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2">
        <label className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
          Model
        </label>
        <select
          className="min-w-0 flex-1 border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-foreground)] outline-none"
          onChange={(event) => setModelKey(event.target.value as AiChatModelKey)}
          value={modelKey}
        >
          <option value="primary">{models.find((model) => model.key === "primary")?.name ?? "Primary model"}</option>
          <option value="secondary">{models.find((model) => model.key === "secondary")?.name ?? "Secondary model"}</option>
        </select>
      </div>
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState>
              Ask AI to summarize, rewrite, expand, translate, or structure the current document.
            </ConversationEmptyState>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((message) => (
                <ChatMessage
                  discarded={discardedIds.has(message.id)}
                  editor={editor}
                  key={message.id}
                  message={message}
                  onDiscard={() =>
                    setDiscardedIds((current) => new Set(current).add(message.id))
                  }
                  onRegenerate={() =>
                    void regenerate({
                      body: getChatRequestBody(editor, modelKey, currentUser?.id ?? ""),
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
              Stop
            </button>
          ) : null}
          {error ? (
            <p className="mt-3 text-xs text-[#dd5b00]">AI request failed. Check model configuration.</p>
          ) : null}
        </ConversationContent>
      </Conversation>
      <PromptInput onSubmit={handleSubmit} text={input}>
        <div className="flex items-end gap-2">
          <UserAvatar user={currentUser} />
          <PromptInputTextarea
            disabled={busy}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask AI about this document"
            value={input}
          />
          <PromptInputSubmit disabled={busy || !input.trim()} />
        </div>
      </PromptInput>
    </aside>
  );
}

function UserAvatar({ user }: { user: User | null }) {
  const initial = (user?.name || user?.username || "?").trim().slice(0, 1).toUpperCase();

  if (user?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt="" className="h-8 w-8 shrink-0 border border-[var(--color-border)] object-cover" src={user.avatarUrl} />
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--color-border)] bg-[var(--color-muted)] text-xs font-semibold text-[var(--color-muted-foreground)]">
      {initial}
    </div>
  );
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
) {
  return {
    documentText: editor?.getText() ?? "",
    modelKey,
    selection: getCurrentSelection(editor),
    userId,
  };
}
