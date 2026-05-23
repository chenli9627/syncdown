"use client";

import type { Editor } from "@tiptap/react";
import {
  Check,
  Copy,
  ListEnd,
  Pencil,
  RefreshCw,
  Replace,
  Send,
  TextCursorInput,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { useLocale } from "@/components/providers/locale-provider";
import type { AiChatMessage } from "@/features/app-state/types";
import {
  getAiChatMessageText,
  insertAiResponseAtCursor,
  insertAiResponseAtEnd,
  replaceSelectionWithAiResponse,
} from "@/features/editor/lib/ai-chat-actions";
import { getAiDocumentEditToolSummary } from "@/features/editor/lib/ai-chat-document-tools";
import { cn } from "@/lib/utils";

type ChatMessageProps = {
  busy?: boolean;
  editingText?: string;
  editor: Editor | null;
  isEditing?: boolean;
  message: AiChatMessage;
  onCancelEdit?: () => void;
  onEdit?: (messageId: string, text: string) => void;
  onEditingTextChange?: (value: string) => void;
  onRegenerate: () => void;
  onSendEdit?: () => void;
};

export function ChatMessage({
  busy = false,
  editingText = "",
  editor,
  isEditing = false,
  message,
  onCancelEdit,
  onEdit,
  onEditingTextChange,
  onRegenerate,
  onSendEdit,
}: ChatMessageProps) {
  const { t } = useLocale();
  const text = getAiChatMessageText(message);
  const isAssistant = message.role === "assistant";
  const toolSummary = isAssistant ? getAiDocumentEditToolSummary(text) : null;
  const displayText = toolSummary ?? text;
  const [copied, setCopied] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      editInputRef.current?.focus();
      editInputRef.current?.setSelectionRange(
        editInputRef.current.value.length,
        editInputRef.current.value.length,
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isEditing]);

  function handleCopy() {
    if (!text.trim()) {
      return;
    }

    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  }

  return (
    <Message className={isAssistant ? "items-start" : "items-end"}>
      <MessageContent
        className={cn(
          isAssistant
            ? "w-full bg-[var(--color-surface)]"
            : "max-w-[88%] bg-[var(--color-muted)]",
        )}
      >
        {isAssistant ? <MessageResponse>{displayText}</MessageResponse> : text}
      </MessageContent>
      {isAssistant && text.trim() ? (
        <MessageActions>
          <MessageAction onClick={handleCopy} tooltip={t("aiCopyAnswer")}>
            {copied ? (
              <Check aria-hidden="true" size={13} />
            ) : (
              <Copy aria-hidden="true" size={13} />
            )}
            <ActionLabel>{copied ? t("aiCopied") : t("copy")}</ActionLabel>
          </MessageAction>
          {!toolSummary ? (
            <>
              <MessageAction
                onClick={() => replaceSelectionWithAiResponse(editor, message, text)}
                tooltip={t("aiReplaceSelection")}
              >
                <Replace aria-hidden="true" size={13} />
                <ActionLabel>{t("apply")}</ActionLabel>
              </MessageAction>
              <MessageAction
                onClick={() => insertAiResponseAtCursor(editor, text)}
                tooltip={t("aiInsertAtCursor")}
              >
                <TextCursorInput aria-hidden="true" size={13} />
                <ActionLabel>{t("aiInsertAtCursor")}</ActionLabel>
              </MessageAction>
              <MessageAction
                onClick={() => insertAiResponseAtEnd(editor, text)}
                tooltip={t("aiInsertAtEnd")}
              >
                <ListEnd aria-hidden="true" size={13} />
                <ActionLabel>{t("aiInsertAtEnd")}</ActionLabel>
              </MessageAction>
            </>
          ) : null}
          <MessageAction onClick={onRegenerate} tooltip={t("aiRetry")}>
            <RefreshCw aria-hidden="true" size={13} />
            <ActionLabel>{t("aiRetry")}</ActionLabel>
          </MessageAction>
        </MessageActions>
      ) : null}
      {!isAssistant && isEditing ? (
        <form
          className="relative ml-auto w-[min(88%,360px)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-whisper)]"
          onSubmit={(event) => {
            event.preventDefault();
            onSendEdit?.();
          }}
        >
          <textarea
            className="max-h-36 min-h-20 w-full resize-none bg-[var(--color-surface)] px-3 pb-12 pt-3 text-sm leading-5 text-[var(--color-foreground)] outline-none"
            disabled={busy}
            onChange={(event) => onEditingTextChange?.(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) {
                return;
              }

              event.preventDefault();
              onSendEdit?.();
            }}
            ref={editInputRef}
            value={editingText}
          />
          <div className="absolute bottom-2 right-2 flex gap-2">
            <button
              className="inline-flex h-7 w-7 items-center justify-center border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              onClick={onCancelEdit}
              title={t("cancel")}
              type="button"
            >
              <X aria-hidden="true" size={13} />
            </button>
            <button
              className="inline-flex h-7 w-7 items-center justify-center border border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:brightness-95 disabled:opacity-50"
              disabled={busy || !editingText.trim()}
              title={t("aiSend")}
              type="submit"
            >
              <Send aria-hidden="true" size={13} />
            </button>
          </div>
        </form>
      ) : null}
      {!isAssistant && text.trim() && !isEditing ? (
        <MessageActions className="justify-end">
          <MessageAction onClick={handleCopy} tooltip={t("aiCopyQuestion")}>
            {copied ? (
              <Check aria-hidden="true" size={13} />
            ) : (
              <Copy aria-hidden="true" size={13} />
            )}
            <ActionLabel>{copied ? t("aiCopied") : t("copy")}</ActionLabel>
          </MessageAction>
          <MessageAction onClick={() => onEdit?.(message.id, text)} tooltip={t("aiEditQuestion")}>
            <Pencil aria-hidden="true" size={13} />
            <ActionLabel>{t("edit")}</ActionLabel>
          </MessageAction>
        </MessageActions>
      ) : null}
    </Message>
  );
}

function ActionLabel({ children }: { children: string }) {
  return (
    <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-[11px] text-[var(--color-foreground)] shadow-[var(--shadow-whisper)] group-hover/action:block group-focus-visible/action:block">
      {children}
    </span>
  );
}
