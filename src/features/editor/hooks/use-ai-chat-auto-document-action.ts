"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import type {
  AiChatDocumentAction,
  AiChatMessage,
} from "@/features/app-state/types";
import {
  appendAiResponseAsDocumentEndBlocks,
  getAiChatMessageText,
  insertAiResponseAtCursor,
  replaceDocumentWithAiResponse,
  replaceSelectionWithAiResponse,
} from "@/features/editor/lib/ai-chat-actions";
import {
  applyAiDocumentEditToolResponse,
  getAiDocumentEditToolOperationCount,
  getAiDocumentEditToolSummary,
} from "@/features/editor/lib/ai-chat-document-tools";

type PendingDocumentAction = {
  action: AiChatDocumentAction;
  submittedMessageCount: number;
};

type UseAiChatAutoDocumentActionArgs = {
  busy: boolean;
  editor: Editor | null;
  error: Error | undefined;
  messages: AiChatMessage[];
  onApplied?: (action: AiChatDocumentAction, messageId: string, summary?: string) => void;
  onApplyFailed?: (messageId: string) => void;
};

export function useAiChatAutoDocumentAction({
  busy,
  editor,
  error,
  messages,
  onApplied,
  onApplyFailed,
}: UseAiChatAutoDocumentActionArgs) {
  const pendingActionRef = useRef<PendingDocumentAction | null>(null);

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

    const responseText = getAiChatMessageText(lastMessage);

    pendingActionRef.current = null;

    if (!responseText) {
      return;
    }

    if (documentAction.action === "edit_blocks") {
      const appliedCount = applyAiDocumentEditToolResponse(editor, responseText);
      const requestedCount = getAiDocumentEditToolOperationCount(responseText);

      if (appliedCount > 0 && appliedCount >= requestedCount) {
        onApplied?.(
          documentAction.action,
          lastMessage.id,
          getAiDocumentEditToolSummary(responseText) ?? undefined,
        );
      } else {
        onApplyFailed?.(lastMessage.id);
      }
      return;
    }

    if (documentAction.action === "insert_end") {
      const didApply = appendAiResponseAsDocumentEndBlocks(editor, responseText);
      if (didApply) {
        onApplied?.(documentAction.action, lastMessage.id);
      } else {
        onApplyFailed?.(lastMessage.id);
      }
      return;
    }

    if (documentAction.action === "insert_cursor") {
      const didApply = insertAiResponseAtCursor(editor, responseText);
      if (didApply) {
        onApplied?.(documentAction.action, lastMessage.id);
      } else {
        onApplyFailed?.(lastMessage.id);
      }
      return;
    }

    if (documentAction.action === "replace_document") {
      const didApply = replaceDocumentWithAiResponse(editor, responseText);
      if (didApply) {
        onApplied?.(documentAction.action, lastMessage.id);
      } else {
        onApplyFailed?.(lastMessage.id);
      }
      return;
    }

    if (documentAction.action === "replace_selection") {
      const didApply = replaceSelectionWithAiResponse(editor, lastMessage, responseText);
      if (didApply) {
        onApplied?.(documentAction.action, lastMessage.id);
      } else {
        onApplyFailed?.(lastMessage.id);
      }
    }
  }, [busy, editor, messages, onApplied, onApplyFailed]);

  useEffect(() => {
    if (error) {
      pendingActionRef.current = null;
    }
  }, [error]);

  function setPendingAction(action: AiChatDocumentAction | null, submittedMessageCount: number) {
    pendingActionRef.current = action
      ? {
          action,
          submittedMessageCount,
        }
      : null;
  }

  return {
    setPendingAction,
  };
}
