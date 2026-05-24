import type { Editor } from "@tiptap/react";
import type { AiChatDocumentBlock } from "@/features/app-state/types";
import {
  getLocalAiDocumentBlocks,
  toAiDocumentBlock,
} from "@/features/editor/lib/ai-chat-document-blocks";
import { applyExecutableOperation } from "@/features/editor/lib/ai-chat-document-edit-operations";
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
  AiDocumentEditPayload,
  ExecutableOperation,
  LocalAiDocumentBlock,
} from "@/features/editor/lib/ai-chat-document-edit-types";
import {
  findTableCellContentRange,
  findTargetTextRange,
} from "@/features/editor/lib/ai-chat-document-edit-ranges";
import { toAiInsertHtml } from "@/features/editor/lib/ai";

export function getAiDocumentBlocks(editor: Editor | null): AiChatDocumentBlock[] {
  return getLocalAiDocumentBlocks(editor).map(toAiDocumentBlock);
}

export function applyAiDocumentEditToolResponse(editor: Editor | null, responseText: string) {
  if (!editor) {
    return 0;
  }

  const payload = parseAiDocumentEditPayload(responseText);

  if (!payload?.operations?.length) {
    return 0;
  }

  const blocks = getLocalAiDocumentBlocks(editor);
  const operations = payload.operations
    .map((operation, index) => toExecutableOperation(operation, blocks, index))
    .filter((operation): operation is ExecutableOperation => Boolean(operation))
    .sort((a, b) => b.position - a.position || b.index - a.index);

  let appliedCount = 0;

  operations.forEach((operation) => {
    const before = getEditorDocumentSnapshot(editor);

    try {
      applyExecutableOperation(editor, operation);
    } catch {
      return;
    }

    if (getEditorDocumentSnapshot(editor) !== before) {
      appliedCount += 1;
    }
  });

  return appliedCount;
}

export function getAiDocumentEditToolSummary(responseText: string) {
  const payload = parseAiDocumentEditPayload(responseText);

  if (!payload?.operations?.length) {
    return null;
  }

  return payload.summary?.trim() || "Document edit operations generated.";
}

function toExecutableOperation(
  operation: AiDocumentEditOperation,
  blocks: LocalAiDocumentBlock[],
  index: number,
): ExecutableOperation | null {
  const block = blocks.find((candidate) => candidate.id === operation.blockId);

  if (!block) {
    return null;
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

function parseAiDocumentEditPayload(responseText: string): AiDocumentEditPayload | null {
  const jsonText = extractJsonObject(responseText);

  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as AiDocumentEditPayload;
    return Array.isArray(parsed.operations) ? parsed : null;
  } catch {
    return null;
  }
}

function extractJsonObject(responseText: string) {
  const trimmed = responseText.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fencedMatch?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  return start >= 0 && end > start ? candidate.slice(start, end + 1) : null;
}

function getEditorDocumentSnapshot(editor: Editor) {
  return JSON.stringify(editor.state.doc.toJSON());
}
