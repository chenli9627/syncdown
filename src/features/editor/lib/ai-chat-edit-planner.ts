import type {
  AiChatDocumentBlock,
  AiChatMessage,
  AiChatResponseMode,
} from "@/features/app-state/types";
import { buildDeterministicAiDocumentEditPayload } from "@/features/editor/lib/ai-chat-deterministic-document-edit";
import { buildDeterministicAiHistoryEditPayload } from "@/features/editor/lib/ai-chat-deterministic-history-edit";

export type AiChatEditPlan =
  | {
      documentAction: "edit_blocks";
      kind: "deterministic_edit";
      payloadText: string;
      responseMode: AiChatResponseMode | null;
    }
  | {
      documentAction: "edit_blocks";
      kind: "llm_edit";
      responseMode: AiChatResponseMode | null;
    };

type PlanAiChatEditOptions = {
  documentBlocks?: AiChatDocumentBlock[];
  messages?: AiChatMessage[];
  prompt: string;
  responseMode: AiChatResponseMode | null;
};

export function planAiChatEdit({
  documentBlocks = [],
  messages = [],
  prompt,
  responseMode,
}: PlanAiChatEditOptions): AiChatEditPlan {
  const deterministicPayload =
    buildDeterministicAiDocumentEditPayload(prompt, documentBlocks) ??
    buildDeterministicAiHistoryEditPayload(prompt, documentBlocks, messages, responseMode);

  if (deterministicPayload) {
    return {
      documentAction: "edit_blocks",
      kind: "deterministic_edit",
      payloadText: JSON.stringify(deterministicPayload),
      responseMode,
    };
  }

  return {
    documentAction: "edit_blocks",
    kind: "llm_edit",
    responseMode,
  };
}
