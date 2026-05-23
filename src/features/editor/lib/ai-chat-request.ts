import type { Editor } from "@tiptap/react";
import type {
  AiChatDocumentAction,
  AiChatModelKey,
  AiChatSelection,
} from "@/features/app-state/types";

export const AI_CHAT_MODEL_STORAGE_KEY = "syncdown.aiChatModelKey";

export function readStoredAiChatModelKey(): AiChatModelKey {
  if (typeof window === "undefined") {
    return "primary";
  }

  const storedModel = window.localStorage.getItem(AI_CHAT_MODEL_STORAGE_KEY);

  return storedModel === "secondary" ? "secondary" : "primary";
}

export function getAiChatRequestBody(
  editor: Editor | null,
  modelKey: AiChatModelKey,
  userId: string,
  documentTitle: string,
  documentAction: AiChatDocumentAction | null = null,
  threadId: string | null = null,
) {
  return {
    documentAction,
    documentText: editor?.getText() ?? "",
    documentTitle,
    modelKey,
    selection: getCurrentSelection(editor),
    threadId,
    userId,
  };
}

function getCurrentSelection(editor: Editor | null): AiChatSelection | null {
  if (!editor || editor.state.selection.empty) {
    return null;
  }

  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to, "\n").trim();

  return text ? { from, text, to } : null;
}
