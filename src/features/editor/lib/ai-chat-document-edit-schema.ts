import type {
  AiDocumentEditOperation,
  BlockTypeName,
  HeadingLevel,
  InlineMarkName,
  ListTypeName,
  LocalAiDocumentBlock,
} from "@/features/editor/lib/ai-chat-document-edit-types";

export function isTextMarkOperation(type: AiDocumentEditOperation["type"]) {
  return type === "set_text_marks" || type === "unset_text_marks";
}

export function normalizeHeadingLevel(level: unknown): HeadingLevel | null {
  return level === 1 || level === 2 || level === 3 || level === 4 || level === 5 || level === 6
    ? level
    : null;
}

export function normalizeBlockType(blockType: unknown): BlockTypeName | null {
  return blockType === "paragraph" || blockType === "heading" || blockType === "codeBlock"
    ? blockType
    : null;
}

export function normalizeInlineMarks(value: InlineMarkName | InlineMarkName[] | undefined) {
  const marks = Array.isArray(value) ? value : value ? [value] : [];
  const allowedMarks = new Set<InlineMarkName>(["bold", "code", "italic", "strike"]);

  return marks.filter((mark): mark is InlineMarkName => allowedMarks.has(mark));
}

export function normalizeListType(listType: unknown): ListTypeName | null {
  return listType === "bulletList" || listType === "orderedList" || listType === "taskList"
    ? listType
    : null;
}

export function canSetHeadingLevel(block: LocalAiDocumentBlock) {
  return block.node.isTextblock && block.node.type.name !== "codeBlock";
}

export function canSetBlockType(block: LocalAiDocumentBlock) {
  return block.node.isTextblock;
}
