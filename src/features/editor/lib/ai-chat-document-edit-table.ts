import type {
  AiDocumentEditOperation,
  ExecutableOperation,
  LocalAiDocumentBlock,
} from "@/features/editor/lib/ai-chat-document-edit-types";
import {
  findTableColumnRanges,
  findTableRowRange,
} from "@/features/editor/lib/ai-chat-document-edit-ranges";

export function isTableStructureOperation(type: AiDocumentEditOperation["type"]) {
  return (
    type === "delete_table_column" ||
    type === "delete_table_row" ||
    type === "insert_table_column_after" ||
    type === "insert_table_column_before" ||
    type === "insert_table_row_after" ||
    type === "insert_table_row_before" ||
    type === "toggle_table_header_row"
  );
}

export function toTableStructureOperation(
  operation: AiDocumentEditOperation,
  index: number,
  block: LocalAiDocumentBlock,
): ExecutableOperation | null {
  if (block.node.type.name !== "table") {
    return null;
  }

  const rowRange = findTableRowRange(block, operation.row);
  const columnRanges = findTableColumnRanges(block, operation.column);
  const range =
    operation.type === "delete_table_column" ||
    operation.type === "insert_table_column_after" ||
    operation.type === "insert_table_column_before"
      ? columnRanges[0]
      : rowRange;

  if (!range) {
    return null;
  }

  return {
    column: operation.column,
    content: "",
    index,
    nodeJson: block.node.toJSON(),
    position: range.from,
    range: { from: block.pos, to: block.pos + block.nodeSize },
    row: operation.row,
    type: operation.type,
  };
}
