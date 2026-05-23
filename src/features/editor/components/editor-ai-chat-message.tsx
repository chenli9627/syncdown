"use client";

import type { Editor } from "@tiptap/react";
import {
  Check,
  ChevronRight,
  Copy,
  CopyPlus,
  Pencil,
  RefreshCw,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { useLocale } from "@/components/providers/locale-provider";
import type { AiChatMessage } from "@/features/app-state/types";
import { toAiInsertHtml } from "@/features/editor/lib/ai";
import { cn } from "@/lib/utils";

type ChatMessageProps = {
  discarded: boolean;
  editor: Editor | null;
  message: AiChatMessage;
  onDiscard: () => void;
  onEdit?: (messageId: string, text: string) => void;
  onRegenerate: () => void;
};

export function ChatMessage({
  discarded,
  editor,
  message,
  onDiscard,
  onEdit,
  onRegenerate,
}: ChatMessageProps) {
  const { t } = useLocale();
  const text = getMessageText(message);
  const isAssistant = message.role === "assistant";
  const [copied, setCopied] = useState(false);

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
      {isAssistant && text.trim() && !discarded ? (
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
            <Check aria-hidden="true" size={13} />
            <ActionLabel>{t("apply")}</ActionLabel>
          </MessageAction>
          <MessageAction
            onClick={() => insertAtCursor(editor, text)}
            tooltip={t("aiInsertAtCursor")}
          >
            <ChevronRight aria-hidden="true" size={13} />
            <ActionLabel>{t("aiCursor")}</ActionLabel>
          </MessageAction>
          <MessageAction onClick={() => insertAtEnd(editor, text)} tooltip={t("aiInsertAtEnd")}>
            <CopyPlus aria-hidden="true" size={13} />
            <ActionLabel>{t("aiEnd")}</ActionLabel>
          </MessageAction>
          <MessageAction onClick={onRegenerate} tooltip={t("aiRetry")}>
            <RefreshCw aria-hidden="true" size={13} />
            <ActionLabel>{t("aiRetry")}</ActionLabel>
          </MessageAction>
          <MessageAction onClick={onDiscard} tooltip={t("aiHideActions")}>
            <X aria-hidden="true" size={13} />
            <ActionLabel>{t("discard")}</ActionLabel>
          </MessageAction>
        </MessageActions>
      ) : null}
      {!isAssistant && text.trim() ? (
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
  const selection = message.metadata?.selection;

  if (!editor || !selection) {
    return;
  }

  const currentText = editor.state.doc
    .textBetween(selection.from, selection.to, "\n")
    .trim();

  if (currentText !== selection.text.trim()) {
    return;
  }

  editor
    .chain()
    .focus()
    .insertContentAt({ from: selection.from, to: selection.to }, toAiInsertHtml(text))
    .run();
}

function insertAtCursor(editor: Editor | null, text: string) {
  editor?.chain().focus().insertContent(toAiInsertHtml(text)).run();
}

function insertAtEnd(editor: Editor | null, text: string) {
  if (!editor) {
    return;
  }

  editor
    .chain()
    .focus()
    .insertContentAt(editor.state.doc.content.size, toAiInsertHtml(text))
    .run();
}
