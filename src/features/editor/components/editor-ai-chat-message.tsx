"use client";

import {
  Check,
  Copy,
  Pencil,
  RefreshCw,
  Send,
  Square,
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
import type { PendingDocumentActionConfirmation } from "@/features/editor/hooks/use-ai-chat-auto-document-action";
import { getAiChatMessageText } from "@/features/editor/lib/ai-chat-actions";
import { getAiDocumentEditToolSummary } from "@/features/editor/lib/ai-chat-document-tools";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

type ChatMessageProps = {
  appliedNotice?: string;
  busy?: boolean;
  editingText?: string;
  isEditing?: boolean;
  message: AiChatMessage;
  onCancelEdit?: () => void;
  onCancelDocumentAction?: () => void;
  onConfirmDocumentAction?: () => void;
  onEdit?: (messageId: string, text: string) => void;
  onEditingTextChange?: (value: string) => void;
  onRegenerate: () => void;
  onSendEdit?: () => void;
  onStop?: () => void;
  pendingDocumentAction?: PendingDocumentActionConfirmation | null;
  showStopAction?: boolean;
};

export function ChatMessage({
  appliedNotice,
  busy = false,
  editingText = "",
  isEditing = false,
  message,
  onCancelEdit,
  onCancelDocumentAction,
  onConfirmDocumentAction,
  onEdit,
  onEditingTextChange,
  onRegenerate,
  onSendEdit,
  onStop,
  pendingDocumentAction = null,
  showStopAction = false,
}: ChatMessageProps) {
  const { t } = useLocale();
  const text = getAiChatMessageText(message, message.metadata?.documentAction ?? null);
  const isAssistant = message.role === "assistant";
  const isAutomaticDocumentAction = isAssistant && Boolean(message.metadata?.documentAction);
  const toolSummary = isAssistant ? getAiDocumentEditToolSummary(text) : null;
  const isNotChangedNotice = isDocumentNotChangedNotice(appliedNotice);
  const canRetry = !isAutomaticDocumentAction;
  const displayText = getDisplayText({
    appliedNotice,
    fallbackNotice: t("aiApplyingDocumentAction"),
    isAutomaticDocumentAction,
    isNotChangedNotice,
    pendingNotice: pendingDocumentAction
      ? getPendingDocumentActionText(pendingDocumentAction, t)
      : null,
    text,
    toolSummary,
  });
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
    const copyText = isAssistant ? displayText : text;

    if (!copyText.trim()) {
      return;
    }

    void navigator.clipboard.writeText(copyText).then(() => {
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
        {isAssistant && appliedNotice && !isAutomaticDocumentAction && !isNotChangedNotice ? (
          <p className="mt-2 border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-muted-foreground)]">
            {appliedNotice}
          </p>
        ) : null}
        {pendingDocumentAction ? (
          <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-2">
            <button
              className="inline-flex h-7 items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-[11px] font-medium text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              disabled={busy}
              onClick={onCancelDocumentAction}
              type="button"
            >
              <X aria-hidden="true" size={12} />
              <span>{t("cancel")}</span>
            </button>
            <button
              className="inline-flex h-7 items-center gap-1.5 border border-[var(--color-primary)] bg-[var(--color-primary)] px-2 text-[11px] font-medium text-[var(--color-primary-foreground)] transition hover:brightness-95 disabled:opacity-50"
              disabled={busy}
              onClick={onConfirmDocumentAction}
              type="button"
            >
              <Check aria-hidden="true" size={12} />
              <span>{t("aiConfirmApply")}</span>
            </button>
          </div>
        ) : null}
      </MessageContent>
      {isAssistant && text.trim() ? (
        showStopAction ? (
          <MessageActions className="opacity-100">
            <button
              className="inline-flex h-7 items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[11px] font-medium text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              onClick={onStop}
              type="button"
            >
              <Square aria-hidden="true" size={11} />
              <span>{t("aiStop")}</span>
            </button>
          </MessageActions>
        ) : (
          <MessageActions>
            <MessageAction onClick={handleCopy} tooltip={t("aiCopyAnswer")}>
              {copied ? (
                <Check aria-hidden="true" size={13} />
              ) : (
                <Copy aria-hidden="true" size={13} />
              )}
              <ActionLabel>{copied ? t("aiCopied") : t("copy")}</ActionLabel>
            </MessageAction>
            {canRetry ? (
              <MessageAction onClick={onRegenerate} tooltip={t("aiRetry")}>
                <RefreshCw aria-hidden="true" size={13} />
                <ActionLabel>{t("aiRetry")}</ActionLabel>
              </MessageAction>
            ) : null}
          </MessageActions>
        )
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

function isDocumentNotChangedNotice(notice: string | undefined) {
  return Boolean(notice && /^(未修改文档|Document was not changed)/i.test(notice.trim()));
}

function getDisplayText({
  appliedNotice,
  fallbackNotice,
  isAutomaticDocumentAction,
  isNotChangedNotice,
  pendingNotice,
  text,
  toolSummary,
}: {
  appliedNotice?: string;
  fallbackNotice: string;
  isAutomaticDocumentAction: boolean;
  isNotChangedNotice: boolean;
  pendingNotice: string | null;
  text: string;
  toolSummary: string | null;
}) {
  if (pendingNotice) {
    return pendingNotice;
  }

  if (isAutomaticDocumentAction) {
    return appliedNotice ?? fallbackNotice;
  }

  return isNotChangedNotice ? (appliedNotice ?? "") : (toolSummary ?? text);
}

function getPendingDocumentActionText(
  pendingDocumentAction: PendingDocumentActionConfirmation,
  t: (key: MessageKey) => string,
) {
  if (pendingDocumentAction.action === "edit_blocks") {
    const parts = [t("aiPendingDocumentAction")];

    if (pendingDocumentAction.summary) {
      parts.push(toPendingDocumentActionSummary(pendingDocumentAction.summary));
    }

    if (pendingDocumentAction.previewLines.length) {
      parts.push(pendingDocumentAction.previewLines.map((line) => `- ${line}`).join("\n"));
    }

    return parts.join("\n\n");
  }

  return `${t("aiPendingGeneratedContent")}\n\n${pendingDocumentAction.responseText}`;
}

function toPendingDocumentActionSummary(summary: string) {
  const trimmed = summary.trim();

  if (!trimmed) {
    return trimmed;
  }

  if (/^已将/u.test(trimmed)) {
    return trimmed.replace(/^已将/u, "将");
  }

  if (/^已删除/u.test(trimmed)) {
    return trimmed.replace(/^已删除/u, "将删除");
  }

  if (/^已移除/u.test(trimmed)) {
    return trimmed.replace(/^已移除/u, "将移除");
  }

  if (/^已更新/u.test(trimmed)) {
    return trimmed.replace(/^已更新/u, "将更新");
  }

  if (/^已勾选/u.test(trimmed)) {
    return trimmed.replace(/^已勾选/u, "将勾选");
  }

  if (/^已取消勾选/u.test(trimmed)) {
    return trimmed.replace(/^已取消勾选/u, "将取消勾选");
  }

  if (/^已改写/u.test(trimmed)) {
    return trimmed.replace(/^已改写/u, "将改写");
  }

  if (/^已在/u.test(trimmed)) {
    return trimmed.replace(/^已在/u, "将在");
  }

  if (/^在.+插入了/u.test(trimmed)) {
    return `将${trimmed}`;
  }

  return trimmed;
}
