import { normalizeListType } from "@/features/editor/lib/ai-chat-document-edit-schema";
import type {
  AiDocumentEditOperation,
  ExecutableOperation,
  LocalAiDocumentBlock,
} from "@/features/editor/lib/ai-chat-document-edit-types";
import { findTaskItemRange } from "@/features/editor/lib/ai-chat-document-edit-ranges";

export function toSetListTypeOperation(
  operation: AiDocumentEditOperation,
  index: number,
  block: LocalAiDocumentBlock,
): ExecutableOperation | null {
  const listType = normalizeListType(operation.listType);

  if (
    !listType ||
    !["paragraph", "bulletList", "orderedList", "taskList"].includes(block.node.type.name)
  ) {
    return null;
  }

  return {
    content: block.text,
    index,
    listType,
    nodeJson: block.node.toJSON(),
    position: block.pos,
    range: { from: block.pos, to: block.pos + block.nodeSize },
    type: operation.type,
  };
}

export function toTaskItemCheckedOperation(
  operation: AiDocumentEditOperation,
  index: number,
  block: LocalAiDocumentBlock,
): ExecutableOperation | null {
  const range = findTaskItemRange(block, operation.targetText);

  if (!range || typeof operation.checked !== "boolean") {
    return null;
  }

  return {
    checked: operation.checked,
    content: "",
    index,
    position: range.from,
    range,
    type: operation.type,
  };
}
