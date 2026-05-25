"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AiChatDocumentAction,
  AiChatMessage,
} from "@/features/app-state/types";
import { getAiChatMessageText } from "@/features/editor/lib/ai-chat-actions";
import {
  applyAiDocumentEditPayloadWithVerification,
} from "@/features/editor/lib/ai-chat-document-tools";
import { getAiChatMessageEditPlan } from "@/features/editor/lib/ai-chat-message-edit-plan";
import type { AiDocumentEditPlan } from "@/features/editor/lib/ai-chat-document-edit-types";

type PendingDocumentAction = {
  action: AiChatDocumentAction;
  submittedMessageCount: number;
};

export type PendingDocumentActionConfirmation = {
  action: AiChatDocumentAction;
  plan: AiDocumentEditPlan;
  message: AiChatMessage;
  messageId: string;
};

type UseAiChatAutoDocumentActionArgs = {
  busy: boolean;
  editor: Editor | null;
  error: Error | undefined;
  handledMessageIds?: ReadonlySet<string>;
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
  handledMessageIds,
  messages,
  onApplied,
  onCancelled,
  onApplyFailed,
}: UseAiChatAutoDocumentActionArgs) {
  const pendingActionRef = useRef<PendingDocumentAction | null>(null);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingDocumentActionConfirmation | null>(null);
  const fallbackPendingConfirmation = useMemo(() => {
    if (busy || !editor || pendingConfirmation) {
      return null;
    }

    const lastUnhandledAssistantEdit = findLastUnhandledAssistantEditMessage(
      messages,
      handledMessageIds,
    );

    if (!lastUnhandledAssistantEdit) {
      return null;
    }

    const plan = getAiChatMessageEditPlan(
      lastUnhandledAssistantEdit,
      "edit_blocks",
      { allowTextFallback: true },
    );

    if (!shouldRequestDocumentActionConfirmation("edit_blocks", plan)) {
      return null;
    }

    return {
      action: "edit_blocks" as const,
      plan: plan!,
      message: lastUnhandledAssistantEdit,
      messageId: lastUnhandledAssistantEdit.id,
    };
  }, [busy, editor, handledMessageIds, messages, pendingConfirmation]);
  const activePendingConfirmation =
    pendingConfirmation ?? fallbackPendingConfirmation;

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

    const plan =
      documentAction.action === "edit_blocks"
        ? getAiChatMessageEditPlan(lastMessage, documentAction.action, {
            allowTextFallback: true,
          })
        : null;

    if (!shouldRequestDocumentActionConfirmation(documentAction.action, plan)) {
      if (documentAction.action === "edit_blocks") {
        onApplyFailed?.(lastMessage.id, plan?.summary, "application_failed");
      }
      return;
    }

    setPendingConfirmation({
      action: documentAction.action,
      plan: plan!,
      message: lastMessage,
      messageId: lastMessage.id,
    });
  }, [busy, editor, messages, onApplied, onApplyFailed]);

  useEffect(() => {
    if (error) {
      pendingActionRef.current = null;
    }
  }, [error]);

  useEffect(() => {
    if (busy || !editor || pendingActionRef.current || pendingConfirmation) {
      return;
    }

    const lastUnhandledAssistantEdit = findLastUnhandledAssistantEditMessage(
      messages,
      handledMessageIds,
    );

    if (!lastUnhandledAssistantEdit) {
      return;
    }

    const plan = getAiChatMessageEditPlan(
      lastUnhandledAssistantEdit,
      "edit_blocks",
      { allowTextFallback: true },
    );

    if (!shouldRequestDocumentActionConfirmation("edit_blocks", plan)) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setPendingConfirmation({
        action: "edit_blocks",
        plan: plan!,
        message: lastUnhandledAssistantEdit,
        messageId: lastUnhandledAssistantEdit.id,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [busy, editor, handledMessageIds, messages, pendingConfirmation]);

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
    const confirmation = activePendingConfirmation;

    if (!editor || confirmation?.messageId !== messageId) {
      return;
    }

    setPendingConfirmation(null);
    applyConfirmedDocumentAction(editor, confirmation, onApplied, onApplyFailed);
  }

  function cancelPendingAction(messageId: string) {
    const confirmation = activePendingConfirmation;

    if (confirmation?.messageId !== messageId) {
      return;
    }

    setPendingConfirmation(null);
    onCancelled?.(messageId);
  }

  return {
    cancelPendingAction,
    confirmPendingAction,
    pendingConfirmation: activePendingConfirmation,
    setPendingAction,
  };
}

function findLastUnhandledAssistantEditMessage(
  messages: AiChatMessage[],
  handledMessageIds: ReadonlySet<string> | undefined,
) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (
      message?.role === "assistant" &&
      !handledMessageIds?.has(message.id) &&
      getAiChatMessageEditPlan(message, "edit_blocks", {
        allowTextFallback: true,
      })
    ) {
      return message;
    }
  }

  return null;
}

function applyConfirmedDocumentAction(
  editor: Editor,
  confirmation: PendingDocumentActionConfirmation,
  onApplied: UseAiChatAutoDocumentActionArgs["onApplied"],
  onApplyFailed: UseAiChatAutoDocumentActionArgs["onApplyFailed"],
) {
  const beforeSnapshot = getEditorDocumentSnapshot(editor);

  if (confirmation.action !== "edit_blocks") {
    onApplyFailed?.(confirmation.messageId, confirmation.plan.summary, "application_failed");
    return;
  }

  const applyResult = applyAiDocumentEditPayloadWithVerification(
    editor,
    confirmation.plan.payload,
  );
  const didApplyAndVerify =
    applyResult.appliedCount > 0 &&
    applyResult.appliedCount >= applyResult.requestedCount &&
    applyResult.verified &&
    getEditorDocumentSnapshot(editor) !== beforeSnapshot;

  if (didApplyAndVerify) {
    onApplied?.(confirmation.action, confirmation.messageId, confirmation.plan.summary);
  } else {
    onApplyFailed?.(
      confirmation.messageId,
      confirmation.plan.summary,
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
  plan: AiDocumentEditPlan | null,
) {
  return action === "edit_blocks" && Boolean(plan && plan.requestedCount > 0);
}
