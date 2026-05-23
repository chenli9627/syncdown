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
import { toAiInlineInsertHtml, toAiInsertHtml } from "@/features/editor/lib/ai";
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
  const text = getMessageText(message);
  const isAssistant = message.role === "assistant";
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
        {isAssistant ? <MessageResponse>{text}</MessageResponse> : text}
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
          <MessageAction
            onClick={() => replaceSelection(editor, message, text)}
            tooltip={t("aiReplaceSelection")}
          >
            <Replace aria-hidden="true" size={13} />
            <ActionLabel>{t("apply")}</ActionLabel>
          </MessageAction>
          <MessageAction
            onClick={() => insertAtCursor(editor, text)}
            tooltip={t("aiInsertAtCursor")}
          >
            <TextCursorInput aria-hidden="true" size={13} />
            <ActionLabel>{t("aiInsertAtCursor")}</ActionLabel>
          </MessageAction>
          <MessageAction onClick={() => insertAtEnd(editor, text)} tooltip={t("aiInsertAtEnd")}>
            <ListEnd aria-hidden="true" size={13} />
            <ActionLabel>{t("aiInsertAtEnd")}</ActionLabel>
          </MessageAction>
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

function getMessageText(message: AiChatMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

function replaceSelection(editor: Editor | null, message: AiChatMessage, text: string) {
  if (!editor) {
    return;
  }

  const currentSelection = editor.state.selection;

  if (!currentSelection.empty) {
    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: currentSelection.from, to: currentSelection.to },
        getAiInsertContentForRange(editor, currentSelection.from, currentSelection.to, text),
      )
      .run();
    return;
  }

  const originalSelection = message.metadata?.selection;

  if (originalSelection) {
    const from = Math.max(0, Math.min(originalSelection.from, editor.state.doc.content.size));
    const to = Math.max(from, Math.min(originalSelection.to, editor.state.doc.content.size));

    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, getAiInsertContentForRange(editor, from, to, text))
      .run();
  }
}

function insertAtCursor(editor: Editor | null, text: string) {
  if (!editor) {
    return;
  }

  const { from, to } = editor.state.selection;

  editor
    .chain()
    .focus()
    .insertContent(getAiInsertContentForRange(editor, from, to, text))
    .run();
}

function insertAtEnd(editor: Editor | null, text: string) {
  if (!editor) {
    return;
  }

  const inlineContent = toAiInlineInsertHtml(text);
  const lastTextblockEnd = getLastTextblockEndPosition(editor);

  if (lastTextblockEnd != null && !isBlockInsertContent(inlineContent)) {
    editor
      .chain()
      .focus()
      .insertContentAt(lastTextblockEnd, inlineContent)
      .run();
    return;
  }

  editor
    .chain()
    .focus()
    .insertContentAt(editor.state.doc.content.size, toAiInsertHtml(text))
    .run();
}

function getAiInsertContentForRange(
  editor: Editor,
  from: number,
  to: number,
  text: string,
) {
  return canInsertInlineAtRange(editor, from, to)
    ? toAiInlineInsertHtml(text)
    : toAiInsertHtml(text);
}

function canInsertInlineAtRange(editor: Editor, from: number, to: number) {
  const docSize = editor.state.doc.content.size;
  const safeFrom = Math.max(0, Math.min(from, docSize));
  const safeTo = Math.max(safeFrom, Math.min(to, docSize));
  const $from = editor.state.doc.resolve(safeFrom);
  const $to = editor.state.doc.resolve(safeTo);

  return $from.parent.isTextblock && $from.sameParent($to);
}

function getLastTextblockEndPosition(editor: Editor) {
  let endPosition: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.isTextblock) {
      endPosition = pos + node.nodeSize - 1;
    }
  });

  return endPosition;
}

function isBlockInsertContent(content: string) {
  return /^<(?:blockquote|h[1-6]|hr|img|ol|p|pre|table|ul)(?:\s|>)/i.test(content.trim());
}
