import type {
  AiDocumentEditOperation,
  LocalAiDocumentBlock,
} from "@/features/editor/lib/ai-chat-document-edit-types";
import { findTableCellContentRange } from "@/features/editor/lib/ai-chat-document-edit-ranges";
import { getExpectedContentText } from "@/features/editor/lib/ai-chat-document-edit-verification-content";

export function tableCellContainsText(
  block: LocalAiDocumentBlock | undefined,
  row: number | undefined,
  column: number | undefined,
  content: string | undefined,
) {
  const expectedText = getExpectedContentText(content);

  if (!block || !expectedText) {
    return false;
  }

  const range = findTableCellContentRange(block, row, column);

  if (!range) {
    return false;
  }

  return block.node.textBetween(range.from - block.pos - 1, range.to - block.pos - 1).includes(
    expectedText,
  );
}

export function getTableRowCount(block: LocalAiDocumentBlock | undefined) {
  if (block?.node.type.name !== "table") {
    return 0;
  }

  let count = 0;
  block.node.forEach((rowNode) => {
    if (rowNode.type.name === "tableRow") {
      count += 1;
    }
  });

  return count;
}

export function getTableColumnCount(block: LocalAiDocumentBlock | undefined) {
  if (block?.node.type.name !== "table") {
    return 0;
  }

  let count = 0;
  const firstRow = block.node.firstChild;

  firstRow?.forEach((cellNode) => {
    if (cellNode.type.name === "tableCell" || cellNode.type.name === "tableHeader") {
      count += 1;
    }
  });

  return count;
}

export function getInsertedColumnIndex(operation: AiDocumentEditOperation) {
  const column = operation.column ?? 1;

  return operation.type === "insert_table_column_after" ? column + 1 : column;
}

export function tableHeaderRowToggled(
  beforeBlock: LocalAiDocumentBlock | undefined,
  afterBlock: LocalAiDocumentBlock | undefined,
) {
  const beforeHeaderCount = getFirstRowHeaderCellCount(beforeBlock);
  const afterHeaderCount = getFirstRowHeaderCellCount(afterBlock);

  return beforeHeaderCount !== afterHeaderCount;
}

function getFirstRowHeaderCellCount(block: LocalAiDocumentBlock | undefined) {
  if (block?.node.type.name !== "table") {
    return 0;
  }

  let count = 0;
  block.node.firstChild?.forEach((cellNode) => {
    if (cellNode.type.name === "tableHeader") {
      count += 1;
    }
  });

  return count;
}
