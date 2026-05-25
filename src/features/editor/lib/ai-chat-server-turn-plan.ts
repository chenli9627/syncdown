import type {
  AiChatDocumentAction,
  AiChatDocumentBlock,
  AiChatMessage,
  AiChatResponseMode,
  AiChatSelection,
} from "@/features/app-state/types";
import { buildDeterministicAiDocumentEditPayload } from "@/features/editor/lib/ai-chat-deterministic-document-edit";
import {
  getAiChatClarificationReply,
  getAiChatUnsupportedReply,
} from "@/features/editor/lib/ai-chat-intent-fallback";
import { planAiChatIntent } from "@/features/editor/lib/ai-chat-intent-planner";

type PlanAiChatServerTurnOptions = {
  documentBlocks?: AiChatDocumentBlock[];
  documentText?: string;
  messages?: AiChatMessage[];
  prompt: string;
  selection?: AiChatSelection | null;
};

export type AiChatServerTurnPlan =
  | {
      clarificationKind: string;
      kind: "clarify";
      text: string;
    }
  | {
      documentAction: "edit_blocks";
      kind: "deterministic_edit";
      payloadText: string;
      responseMode: AiChatResponseMode | null;
    }
  | {
      documentAction: AiChatDocumentAction | null;
      kind: "llm";
      responseMode: AiChatResponseMode | null;
    }
  | {
      kind: "unsupported";
      text: string;
    };

export function planAiChatServerTurn({
  documentBlocks = [],
  documentText = "",
  messages = [],
  prompt,
  selection = null,
}: PlanAiChatServerTurnOptions): AiChatServerTurnPlan {
  const intentPlan = planAiChatIntent(prompt, {
    documentBlocks,
    documentText,
    hasRecentAssistantAnswer: hasRecentSubstantiveAssistantAnswer(messages),
    hasRecentDocumentAction: hasRecentDocumentAction(messages),
    hasSelection: Boolean(selection?.text?.trim()),
  });

  if (intentPlan.kind === "clarify") {
    return {
      clarificationKind: intentPlan.clarification.kind,
      kind: "clarify",
      text: getAiChatClarificationReply(intentPlan.clarification.kind, prompt),
    };
  }

  if (intentPlan.kind === "unsupported") {
    return {
      kind: "unsupported",
      text: getAiChatUnsupportedReply(intentPlan.reason, prompt),
    };
  }

  if (intentPlan.kind === "edit") {
    const deterministicPayload = buildDeterministicAiDocumentEditPayload(prompt, documentBlocks);

    if (deterministicPayload) {
      return {
        documentAction: "edit_blocks",
        kind: "deterministic_edit",
        payloadText: JSON.stringify(deterministicPayload),
        responseMode: intentPlan.responseMode,
      };
    }

    return {
      documentAction: intentPlan.documentAction,
      kind: "llm",
      responseMode: intentPlan.responseMode,
    };
  }

  return {
    documentAction: null,
    kind: "llm",
    responseMode: intentPlan.responseMode,
  };
}

function hasRecentDocumentAction(messages: AiChatMessage[]) {
  return messages
    .slice(-8)
    .some((message) => Boolean(message.metadata?.documentAction));
}

function hasRecentSubstantiveAssistantAnswer(messages: AiChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message?.role !== "assistant") {
      continue;
    }

    if (message.metadata?.documentAction || message.metadata?.clarificationKind) {
      continue;
    }

    if (getMessageText(message).trim().length > 0) {
      return true;
    }
  }

  return false;
}

function getMessageText(message: AiChatMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}
