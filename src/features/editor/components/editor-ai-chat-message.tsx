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
import {
  buildChatMessageDisplayText,
  isDocumentNotChangedNotice,
} from "@/features/editor/components/editor-ai-chat-message-display";
import type { PendingDocumentActionConfirmation } from "@/features/editor/hooks/use-ai-chat-auto-document-action";
import { getAiChatMessageText } from "@/features/editor/lib/ai-chat-actions";
import { getAiChatMessageEditPlan } from "@/features/editor/lib/ai-chat-message-edit-plan";
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
  const detectedEditPlan = isAssistant
    ? getAiChatMessageEditPlan(message, "edit_blocks", {
        allowTextFallback: true,
      })
    : null;
  const isAutomaticDocumentAction =
    isAssistant &&
    (Boolean(message.metadata?.documentAction) || Boolean(detectedEditPlan));
  const toolSummary = detectedEditPlan?.summary ?? null;
  const toolPreviewLines = detectedEditPlan?.previewLines ?? [];
  const isNotChangedNotice = isDocumentNotChangedNotice(appliedNotice);
  const canRetry = !isAutomaticDocumentAction;
  const displayText = isAssistant
    ? buildChatMessageDisplayText({
        appliedNotice,
        fallbackNotice: t("aiApplyingDocumentAction"),
        isAutomaticDocumentAction,
        pendingDocumentAction,
        plainText: text,
        t,
        toolRequestedCount: detectedEditPlan?.requestedCount ?? 0,
        toolPreviewLines,
        toolSummary,
      })
    : text;
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
            : "max-w-[88%] bg-[var(--color-muted)] whitespace-pre-wrap break-words",
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
