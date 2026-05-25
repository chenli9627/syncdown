"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import type {
  AiChatDocumentAction,
  AiChatMessage,
} from "@/features/app-state/types";
import { getAiChatMessageText } from "@/features/editor/lib/ai-chat-actions";
import {
  applyAiDocumentEditToolResponseWithVerification,
  getAiDocumentEditToolPreviewLines,
  getAiDocumentEditToolOperationCount,
  getAiDocumentEditToolSummary,
} from "@/features/editor/lib/ai-chat-document-tools";

type PendingDocumentAction = {
  action: AiChatDocumentAction;
  submittedMessageCount: number;
};

export type PendingDocumentActionConfirmation = {
  action: AiChatDocumentAction;
  message: AiChatMessage;
  messageId: string;
  previewLines: string[];
  responseText: string;
  summary?: string;
};

type UseAiChatAutoDocumentActionArgs = {
  busy: boolean;
  editor: Editor | null;
  error: Error | undefined;
  messages: AiChatMessage[];
  onApplied?: (action: AiChatDocumentAction, messageId: string, summary?: string) => void;
  onCancelled?: (messageId: string) => void;
  onApplyFailed?: (messageId: string, summary?: string, reason?: AiDocumentApplyFailureReason) => void;
};

export type AiDocumentApplyFailureReason = "application_failed" | "verification_failed";

export function useAiChatAutoDocumentAction({
  busy,
  editor,
  error,
  messages,
  onApplied,
  onCancelled,
  onApplyFailed,
}: UseAiChatAutoDocumentActionArgs) {
  const pendingActionRef = useRef<PendingDocumentAction | null>(null);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingDocumentActionConfirmation | null>(null);

  useEffect(() => {
    if (busy || !editor) {
      return;
    }

    const documentAction = pendingActionRef.current;

    if (!documentAction) {
      return;
    }

    const lastMessage = messages[messages.length - 1];

    if (messages.length <= documentAction.submittedMessageCount) {
      return;
    }

    if (!lastMessage || lastMessage.role !== "assistant") {
      return;
    }

    const responseText = getAiChatMessageText(lastMessage, documentAction.action);

    pendingActionRef.current = null;

    if (!responseText) {
      return;
    }

    const summary =
      documentAction.action === "edit_blocks"
        ? (getAiDocumentEditToolSummary(responseText) ?? undefined)
        : undefined;

    if (!shouldRequestDocumentActionConfirmation(documentAction.action, responseText)) {
      if (documentAction.action === "edit_blocks") {
        onApplyFailed?.(lastMessage.id, summary, "application_failed");
      }
      return;
    }

    setPendingConfirmation({
      action: documentAction.action,
      message: lastMessage,
      messageId: lastMessage.id,
      previewLines:
        documentAction.action === "edit_blocks"
          ? getAiDocumentEditToolPreviewLines(responseText)
          : [],
      responseText,
      summary,
    });
  }, [busy, editor, messages, onApplied, onApplyFailed]);

  useEffect(() => {
    if (error) {
      pendingActionRef.current = null;
    }
  }, [error]);

  function setPendingAction(action: AiChatDocumentAction | null, submittedMessageCount: number) {
    setPendingConfirmation(null);
    pendingActionRef.current = action
      ? {
          action,
          submittedMessageCount,
        }
      : null;
  }

  function confirmPendingAction(messageId: string) {
    if (!editor || pendingConfirmation?.messageId !== messageId) {
      return;
    }

    const confirmation = pendingConfirmation;

    setPendingConfirmation(null);
    applyConfirmedDocumentAction(editor, confirmation, onApplied, onApplyFailed);
  }

  function cancelPendingAction(messageId: string) {
    if (pendingConfirmation?.messageId !== messageId) {
      return;
    }

    setPendingConfirmation(null);
    onCancelled?.(messageId);
  }

  return {
    cancelPendingAction,
    confirmPendingAction,
    pendingConfirmation,
    setPendingAction,
  };
}

function applyConfirmedDocumentAction(
  editor: Editor,
  confirmation: PendingDocumentActionConfirmation,
  onApplied: UseAiChatAutoDocumentActionArgs["onApplied"],
  onApplyFailed: UseAiChatAutoDocumentActionArgs["onApplyFailed"],
) {
  const beforeSnapshot = getEditorDocumentSnapshot(editor);

  if (confirmation.action !== "edit_blocks") {
    onApplyFailed?.(confirmation.messageId, confirmation.summary, "application_failed");
    return;
  }

  const applyResult = applyAiDocumentEditToolResponseWithVerification(
    editor,
    confirmation.responseText,
  );
  const didApplyAndVerify =
    applyResult.appliedCount > 0 &&
    applyResult.appliedCount >= applyResult.requestedCount &&
    applyResult.verified &&
    getEditorDocumentSnapshot(editor) !== beforeSnapshot;

  if (didApplyAndVerify) {
    onApplied?.(confirmation.action, confirmation.messageId, confirmation.summary);
  } else {
    onApplyFailed?.(
      confirmation.messageId,
      confirmation.summary,
      applyResult.appliedCount > 0 && !applyResult.verified
        ? "verification_failed"
        : "application_failed",
    );
  }
}

function getEditorDocumentSnapshot(editor: Editor) {
  return JSON.stringify(editor.state.doc.toJSON());
}

export function shouldRequestDocumentActionConfirmation(
  action: AiChatDocumentAction,
  responseText: string,
) {
  return action === "edit_blocks" && getAiDocumentEditToolOperationCount(responseText) > 0;
}
