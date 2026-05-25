import type {
  AiDocumentEditOperation,
  LocalAiDocumentBlock,
} from "@/features/editor/lib/ai-chat-document-edit-types";
import {
  blockContainsContent,
  blockContainsText,
  blocksContainInsertedContent,
  verifyBlockPlacementOperation,
} from "@/features/editor/lib/ai-chat-document-edit-verification-blocks";
import {
  blockTextHasLink,
  blockTextHasMarks,
} from "@/features/editor/lib/ai-chat-document-edit-verification-marks";
import {
  getInsertedColumnIndex,
  getTableColumnCount,
  getTableRowCount,
  tableCellContainsText,
  tableHeaderRowToggled,
} from "@/features/editor/lib/ai-chat-document-edit-verification-table";

export type AiDocumentEditVerificationResult = {
  failedCount: number;
  verified: boolean;
};

export function verifyAiDocumentEditOperations(
  operations: AiDocumentEditOperation[],
  beforeBlocks: LocalAiDocumentBlock[],
  afterBlocks: LocalAiDocumentBlock[],
): AiDocumentEditVerificationResult {
  let failedCount = 0;

  operations.forEach((operation) => {
    if (!verifyAiDocumentEditOperation(operation, beforeBlocks, afterBlocks)) {
      failedCount += 1;
    }
  });

  return {
    failedCount,
    verified: failedCount === 0,
  };
}

function verifyAiDocumentEditOperation(
  operation: AiDocumentEditOperation,
  beforeBlocks: LocalAiDocumentBlock[],
  afterBlocks: LocalAiDocumentBlock[],
) {
  const beforeBlock = beforeBlocks.find((block) => block.id === operation.blockId);
  const afterBlock = getBlockAtOriginalIndex(operation.blockId, afterBlocks);

  if (operation.type === "delete_block") {
    return beforeBlock ? !hasSameBlockAtOriginalIndex(beforeBlock, afterBlock) : false;
  }

  if (operation.type === "replace_block") {
    return blockContainsContent(afterBlock, operation.content);
  }

  if (operation.type === "insert_before_block" || operation.type === "insert_after_block") {
    return blocksContainInsertedContent(afterBlocks, operation.content);
  }

  if (operation.type === "replace_text_in_block") {
    const targetText = operation.targetText;
    const replacementText = operation.replacementText ?? "";
    const replacementContainsTarget =
      Boolean(targetText) && Boolean(replacementText) && replacementText.includes(targetText ?? "");

    return (
      Boolean(targetText) &&
      blockContainsText(afterBlock, replacementText) &&
      (replacementContainsTarget
        ? beforeBlock?.text !== afterBlock?.text
        : !blockContainsText(afterBlock, targetText ?? ""))
    );
  }

  if (operation.type === "replace_all_text") {
    const beforeDocumentText = beforeBlocks.map((block) => block.text).join("\n");
    const documentText = afterBlocks.map((block) => block.text).join("\n");
    const replacementText = operation.replacementText ?? "";
    const targetText = operation.targetText;
    const replacementContainsTarget =
      Boolean(targetText) && Boolean(replacementText) && replacementText.includes(targetText ?? "");

    return (
      Boolean(targetText) &&
      (replacementContainsTarget
        ? beforeDocumentText !== documentText
        : !documentText.includes(targetText ?? "")) &&
      (!replacementText || documentText.includes(replacementText))
    );
  }

  if (operation.type === "set_heading_level") {
    return afterBlock?.type === "heading" && afterBlock.level === operation.level;
  }

  if (operation.type === "set_block_type") {
    if (!operation.blockType || !afterBlock || afterBlock.type !== operation.blockType) {
      return false;
    }

    return (
      operation.blockType !== "heading" || afterBlock.level === operation.level
    );
  }

  if (operation.type === "set_list_type") {
    return Boolean(operation.listType) && afterBlock?.type === operation.listType;
  }

  if (operation.type === "set_task_item_checked") {
    return nodeHasTaskItemChecked(afterBlock, operation.targetText, operation.checked);
  }

  if (operation.type === "set_text_marks" || operation.type === "unset_text_marks") {
    return blockTextHasMarks(
      afterBlock,
      operation.targetText,
      operation.marks ?? operation.mark,
      operation.type === "set_text_marks",
    );
  }

  if (operation.type === "set_link" || operation.type === "unset_link") {
    return blockTextHasLink(
      afterBlock,
      operation.targetText,
      operation.type === "set_link" ? operation.href : undefined,
      operation.type === "set_link",
    );
  }

  if (operation.type === "update_table_cell") {
    return tableCellContainsText(afterBlock, operation.row, operation.column, operation.content);
  }

  if (
    operation.type === "insert_table_row_before" ||
    operation.type === "insert_table_row_after"
  ) {
    return getTableRowCount(afterBlock) === getTableRowCount(beforeBlock) + 1;
  }

  if (operation.type === "delete_table_row") {
    return getTableRowCount(afterBlock) === Math.max(0, getTableRowCount(beforeBlock) - 1);
  }

  if (
    operation.type === "insert_table_column_before" ||
    operation.type === "insert_table_column_after"
  ) {
    return (
      getTableColumnCount(afterBlock) === getTableColumnCount(beforeBlock) + 1 &&
      (!operation.content ||
        tableCellContainsText(
          afterBlock,
          1,
          getInsertedColumnIndex(operation),
          operation.content,
        ))
    );
  }

  if (operation.type === "delete_table_column") {
    return getTableColumnCount(afterBlock) === Math.max(0, getTableColumnCount(beforeBlock) - 1);
  }

  if (operation.type === "toggle_table_header_row") {
    return tableHeaderRowToggled(beforeBlock, afterBlock);
  }

  if (operation.type === "move_block" || operation.type === "copy_block") {
    return verifyBlockPlacementOperation(operation, beforeBlocks, afterBlocks);
  }

  return false;
}

function getBlockAtOriginalIndex(blockId: string, blocks: LocalAiDocumentBlock[]) {
  const index = getBlockIndex(blockId);

  return index == null ? undefined : blocks[index];
}

function getBlockIndex(blockId: string) {
  const match = blockId.match(/^block_(\d+)$/);

  return match ? Number(match[1]) - 1 : null;
}

function hasSameBlockAtOriginalIndex(
  beforeBlock: LocalAiDocumentBlock,
  afterBlock: LocalAiDocumentBlock | undefined,
) {
  return Boolean(
    afterBlock &&
      afterBlock.type === beforeBlock.type &&
      afterBlock.level === beforeBlock.level &&
      afterBlock.text === beforeBlock.text,
  );
}

function nodeHasTaskItemChecked(
  block: LocalAiDocumentBlock | undefined,
  targetText: string | undefined,
  checked: boolean | undefined,
) {
  if (!block || typeof checked !== "boolean") {
    return false;
  }

  let found = false;

  block.node.descendants((node) => {
    if (
      !found &&
      node.type.name === "taskItem" &&
      (!targetText || node.textContent.includes(targetText)) &&
      node.attrs.checked === checked
    ) {
      found = true;
    }
  });

  return found;
}
