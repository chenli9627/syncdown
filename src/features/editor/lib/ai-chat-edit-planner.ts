import type { AiChatDocumentBlock, AiChatResponseMode } from "@/features/app-state/types";
import { buildDeterministicAiDocumentEditPayload } from "@/features/editor/lib/ai-chat-deterministic-document-edit";

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
  prompt: string;
  responseMode: AiChatResponseMode | null;
};

export function planAiChatEdit({
  documentBlocks = [],
  prompt,
  responseMode,
}: PlanAiChatEditOptions): AiChatEditPlan {
  const deterministicPayload = buildDeterministicAiDocumentEditPayload(prompt, documentBlocks);

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
