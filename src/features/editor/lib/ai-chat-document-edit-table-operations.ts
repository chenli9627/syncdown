import type { Editor } from "@tiptap/react";
import type { ExecutableOperation } from "@/features/editor/lib/ai-chat-document-edit-types";

export function updateTableStructure(editor: Editor, operation: ExecutableOperation) {
  if (!operation.nodeJson) {
    return;
  }

  const tableJson = cloneJsonNode(operation.nodeJson);
  const nextTableJson = mutateTableJson(tableJson, operation);

  if (!nextTableJson) {
    return;
  }

  const transaction = editor.state.tr.replaceWith(
    operation.range.from,
    operation.range.to,
    editor.state.schema.nodeFromJSON(nextTableJson),
  );
  editor.view.dispatch(transaction);
  editor.commands.focus();
}

export function isTableStructureOperation(type: ExecutableOperation["type"]) {
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

function mutateTableJson(tableJson: JsonNode, operation: ExecutableOperation) {
  const rows = tableJson.content;

  if (tableJson.type !== "table" || !rows?.length) {
    return null;
  }

  if (operation.type === "toggle_table_header_row") {
    toggleHeaderRow(rows[0]);
    return tableJson;
  }

  if (operation.type === "delete_table_row") {
    rows.splice((operation.row ?? 1) - 1, 1);
    return rows.length ? tableJson : null;
  }

  if (operation.type === "insert_table_row_before" || operation.type === "insert_table_row_after") {
    const rowIndex = (operation.row ?? 1) - 1;
    const referenceRow = rows[rowIndex];

    if (!referenceRow) {
      return null;
    }

    rows.splice(
      operation.type === "insert_table_row_before" ? rowIndex : rowIndex + 1,
      0,
      clearNodeText(referenceRow),
    );
    return tableJson;
  }

  return mutateTableColumnJson(tableJson, operation);
}

function mutateTableColumnJson(tableJson: JsonNode, operation: ExecutableOperation) {
  const rows = tableJson.content;
  const columnIndex = (operation.column ?? 1) - 1;

  if (!rows?.length || columnIndex < 0) {
    return null;
  }

  if (operation.type === "delete_table_column") {
    rows.forEach((row) => row.content?.splice(columnIndex, 1));
    return rows.some((row) => row.content?.length) ? tableJson : null;
  }

  if (
    operation.type !== "insert_table_column_before" &&
    operation.type !== "insert_table_column_after"
  ) {
    return null;
  }

  rows.forEach((row) => {
    const cells = row.content;
    const referenceCell = cells?.[columnIndex];

    if (!cells || !referenceCell) {
      return;
    }

    cells.splice(
      operation.type === "insert_table_column_before" ? columnIndex : columnIndex + 1,
      0,
      clearNodeText(referenceCell),
    );
  });

  return tableJson;
}

function toggleHeaderRow(row: JsonNode | undefined) {
  if (!row?.content?.length) {
    return;
  }

  const shouldUseHeader = row.content.some((cell) => cell.type !== "tableHeader");
  row.content = row.content.map((cell) => ({
    ...cell,
    type: shouldUseHeader ? "tableHeader" : "tableCell",
  }));
}

function clearNodeText(node: JsonNode): JsonNode {
  const next = cloneJsonNode(node);

  if (next.text != null) {
    next.text = "";
  }

  if (next.content) {
    next.content = next.content.map((child) => clearNodeText(child));
  }

  return next;
}

function cloneJsonNode(value: unknown): JsonNode {
  return JSON.parse(JSON.stringify(value)) as JsonNode;
}

type JsonNode = {
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  text?: string;
  type: string;
};
