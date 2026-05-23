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
  replaceSelectionWithAiResponse,
} from "@/features/editor/lib/ai-chat-actions";

type UseAiChatAutoDocumentActionArgs = {
  busy: boolean;
  editor: Editor | null;
  error: Error | undefined;
  messages: AiChatMessage[];
};

export function useAiChatAutoDocumentAction({
  busy,
  editor,
  error,
  messages,
}: UseAiChatAutoDocumentActionArgs) {
  const pendingActionRef = useRef<AiChatDocumentAction | null>(null);

  useEffect(() => {
    if (busy || !editor) {
      return;
    }

    const documentAction = pendingActionRef.current;

    if (!documentAction) {
      return;
    }

    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role !== "assistant") {
      return;
    }

    const responseText = getAiChatMessageText(lastMessage);

    pendingActionRef.current = null;

    if (!responseText) {
      return;
    }

    if (documentAction === "insert_end") {
      appendAiResponseAsDocumentEndBlocks(editor, responseText);
      return;
    }

    if (documentAction === "insert_cursor") {
      insertAiResponseAtCursor(editor, responseText);
      return;
    }

    if (documentAction === "replace_selection") {
      replaceSelectionWithAiResponse(editor, lastMessage, responseText);
    }
  }, [busy, editor, messages]);

  useEffect(() => {
    if (error) {
      pendingActionRef.current = null;
    }
  }, [error]);

  function setPendingAction(action: AiChatDocumentAction | null) {
    pendingActionRef.current = action;
  }

  return {
    setPendingAction,
  };
}
