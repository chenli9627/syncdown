import type {
  AiChatDocumentAction,
  AiChatMessage,
} from "@/features/app-state/types";
import { parseAiDocumentEditPlan } from "@/features/editor/lib/ai-chat-document-edit-plan";

type GetAiChatMessageEditPlanOptions = {
  allowTextFallback?: boolean;
};

export function getAiChatMessageEditPlan(
  message: AiChatMessage,
  documentAction: AiChatDocumentAction | null = message.metadata?.documentAction ?? null,
  options: GetAiChatMessageEditPlanOptions = {},
) {
  if (documentAction !== "edit_blocks") {
    return null;
  }

  if (message.metadata?.editPlan) {
    return message.metadata.editPlan;
  }

  return options.allowTextFallback === false
    ? null
    : parseAiDocumentEditPlan(getAiChatMessageText(message));
}

export function withAiChatMessageEditPlan(
  message: AiChatMessage,
  documentAction: AiChatDocumentAction | null = message.metadata?.documentAction ?? null,
): AiChatMessage {
  const editPlan = getAiChatMessageEditPlan(message, documentAction, {
    allowTextFallback: true,
  });

  if (!editPlan) {
    return message;
  }

  return {
    ...message,
    metadata: {
      ...message.metadata,
      createdAt: message.metadata?.createdAt ?? new Date().toISOString(),
      documentAction,
      editPlan,
    },
  };
}

function getAiChatMessageText(message: AiChatMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}
