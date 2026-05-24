import {
  canSetBlockType,
  canSetHeadingLevel,
  isTextMarkOperation,
  normalizeBlockType,
  normalizeHeadingLevel,
  normalizeInlineMarks,
} from "@/features/editor/lib/ai-chat-document-edit-schema";
import type {
  AiDocumentEditOperation,
  ExecutableOperation,
  LocalAiDocumentBlock,
} from "@/features/editor/lib/ai-chat-document-edit-types";
import { isTableStructureOperation, toTableStructureOperation } from "@/features/editor/lib/ai-chat-document-edit-table";
import { toSetListTypeOperation, toTaskItemCheckedOperation } from "@/features/editor/lib/ai-chat-document-edit-list";
import {
  findTableCellContentRange,
  findTargetTextRange,
} from "@/features/editor/lib/ai-chat-document-edit-ranges";
import { toAiInsertHtml } from "@/features/editor/lib/ai";

export function toExecutableOperations(
  operation: AiDocumentEditOperation,
  blocks: LocalAiDocumentBlock[],
  index: number,
): ExecutableOperation[] {
  if (operation.type === "replace_all_text") {
    return toReplaceAllTextOperations(operation, blocks, index);
  }

  const block = blocks.find((candidate) => candidate.id === operation.blockId);

  if (!block) {
    return [];
  }

  const executable = toExecutableOperation(operation, blocks, index, block);
  return executable ? [executable] : [];
}

function toExecutableOperation(
  operation: AiDocumentEditOperation,
  blocks: LocalAiDocumentBlock[],
  index: number,
  block: LocalAiDocumentBlock,
): ExecutableOperation | null {
  if (operation.type === "move_block" || operation.type === "copy_block") {
    return toBlockPlacementOperation(operation, blocks, index, block);
  }

  if (operation.type === "replace_text_in_block") {
    return toTextReplacementOperation(operation, index, block);
  }

  if (isTextMarkOperation(operation.type)) {
    return toTextMarkOperation(operation, index, block);
  }

  if (operation.type === "set_link" || operation.type === "unset_link") {
    return toLinkOperation(operation, index, block);
  }

  if (operation.type === "set_list_type") {
    return toSetListTypeOperation(operation, index, block);
  }

  if (operation.type === "set_task_item_checked") {
    return toTaskItemCheckedOperation(operation, index, block);
  }

  if (isTableStructureOperation(operation.type)) {
    return toTableStructureOperation(operation, index, block);
  }

  const range = { from: block.pos, to: block.pos + block.nodeSize };
  const position = operation.type === "insert_after_block" ? range.to : range.from;

  if (operation.type === "set_block_type") {
    return toSetBlockTypeOperation(operation, index, block, range, position);
  }

  if (operation.type === "set_heading_level") {
    return toSetHeadingLevelOperation(operation, index, block, range, position);
  }

  if (operation.type === "update_table_cell") {
    return toUpdateTableCellOperation(operation, index, block);
  }

  const content = operation.content?.trim() ? toAiInsertHtml(operation.content) : "";

  if (operation.type !== "delete_block" && !content) {
    return null;
  }

  return {
    content,
    index,
    position,
    range,
    type: operation.type,
  };
}

function toBlockPlacementOperation(
  operation: AiDocumentEditOperation,
  blocks: LocalAiDocumentBlock[],
  index: number,
  block: LocalAiDocumentBlock,
): ExecutableOperation | null {
  const targetBlock = blocks.find((candidate) => candidate.id === operation.targetBlockId);

  if (!targetBlock || targetBlock.id === block.id) {
    return null;
  }

  const targetRange = { from: targetBlock.pos, to: targetBlock.pos + targetBlock.nodeSize };
  const targetPosition = operation.placement === "before" ? targetRange.from : targetRange.to;

  return {
    content: "",
    index,
    nodeJson: block.node.toJSON(),
    position: block.pos,
    range: { from: block.pos, to: block.pos + block.nodeSize },
    targetPosition,
    type: operation.type,
  };
}

function toTextReplacementOperation(
  operation: AiDocumentEditOperation,
  index: number,
  block: LocalAiDocumentBlock,
): ExecutableOperation | null {
  const range = findTargetTextRange(block, operation.targetText);

  if (!range) {
    return null;
  }

  return {
    content: operation.replacementText ?? "",
    index,
    position: range.from,
    range,
    type: operation.type,
  };
}

function toReplaceAllTextOperations(
  operation: AiDocumentEditOperation,
  blocks: LocalAiDocumentBlock[],
  index: number,
): ExecutableOperation[] {
  const targetText = operation.targetText;

  if (!targetText) {
    return [];
  }

  const operations: ExecutableOperation[] = [];

  blocks.forEach((block, blockIndex) => {
    const range = findTargetTextRange(block, targetText);

    if (!range) {
      return;
    }

    operations.push({
      content: operation.replacementText ?? "",
      index: index + blockIndex / 1000,
      position: range.from,
      range,
      targetText,
      type: "replace_all_text",
    });
  });

  return operations;
}

function toTextMarkOperation(
  operation: AiDocumentEditOperation,
  index: number,
  block: LocalAiDocumentBlock,
): ExecutableOperation | null {
  const range = findTargetTextRange(block, operation.targetText);
  const marks = normalizeInlineMarks(operation.marks ?? operation.mark);

  if (!range || !marks.length) {
    return null;
  }

  return {
    content: "",
    index,
    marks,
    position: range.from,
    range,
    type: operation.type,
  };
}

function toLinkOperation(
  operation: AiDocumentEditOperation,
  index: number,
  block: LocalAiDocumentBlock,
): ExecutableOperation | null {
  const range = findTargetTextRange(block, operation.targetText);
  const href = operation.href?.trim();

  if (!range || (operation.type === "set_link" && !href)) {
    return null;
  }

  return {
    content: "",
    href,
    index,
    position: range.from,
    range,
    type: operation.type,
  };
}

function toSetBlockTypeOperation(
  operation: AiDocumentEditOperation,
  index: number,
  block: LocalAiDocumentBlock,
  range: { from: number; to: number },
  position: number,
): ExecutableOperation | null {
  const blockType = normalizeBlockType(operation.blockType);
  const level = blockType === "heading" ? normalizeHeadingLevel(operation.level) : undefined;

  if (!blockType || (blockType === "heading" && !level) || !canSetBlockType(block)) {
    return null;
  }

  return {
    blockType,
    content: block.text,
    index,
    level: level ?? undefined,
    position,
    range,
    type: operation.type,
  };
}

function toSetHeadingLevelOperation(
  operation: AiDocumentEditOperation,
  index: number,
  block: LocalAiDocumentBlock,
  range: { from: number; to: number },
  position: number,
): ExecutableOperation | null {
  const level = normalizeHeadingLevel(operation.level);

  if (!level || !canSetHeadingLevel(block)) {
    return null;
  }

  return {
    content: "",
    index,
    level,
    position,
    range,
    type: operation.type,
  };
}

function toUpdateTableCellOperation(
  operation: AiDocumentEditOperation,
  index: number,
  block: LocalAiDocumentBlock,
): ExecutableOperation | null {
  const range = findTableCellContentRange(block, operation.row, operation.column);
  const content = operation.content?.trim() ? toAiInsertHtml(operation.content) : "";

  if (!range || !content) {
    return null;
  }

  return {
    content,
    index,
    position: range.from,
    range,
    type: operation.type,
  };
}
