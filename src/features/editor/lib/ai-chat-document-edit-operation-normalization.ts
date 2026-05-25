const OPERATION_TYPE_MAP = {
  copyblock: "copy_block",
  deleteblock: "delete_block",
  deletetablecolumn: "delete_table_column",
  deletetablerow: "delete_table_row",
  insertafterblock: "insert_after_block",
  insertbeforeblock: "insert_before_block",
  inserttablecolumnafter: "insert_table_column_after",
  inserttablecolumnbefore: "insert_table_column_before",
  inserttablerowafter: "insert_table_row_after",
  inserttablerowbefore: "insert_table_row_before",
  moveafterblock: "move_after_block",
  movebeforeblock: "move_before_block",
  moveblock: "move_block",
  replacealltext: "replace_all_text",
  replaceblock: "replace_block",
  replacetextinblock: "replace_text_in_block",
  setblocktype: "set_block_type",
  setheadinglevel: "set_heading_level",
  setlink: "set_link",
  setlisttype: "set_list_type",
  settaskitemchecked: "set_task_item_checked",
  settextmarks: "set_text_marks",
  toggletableheaderrow: "toggle_table_header_row",
  unsetlink: "unset_link",
  unsettextmarks: "unset_text_marks",
  updatetablecell: "update_table_cell",
} as const;

export function normalizeAiDocumentEditOperationType(type: string | undefined) {
  if (!type) {
    return null;
  }

  const normalizedKey = type.toLowerCase().replace(/[^a-z0-9]/g, "");
  return OPERATION_TYPE_MAP[normalizedKey as keyof typeof OPERATION_TYPE_MAP] ?? null;
}

export function hasSupportedAiDocumentEditOperationTypes(operations: unknown) {
  if (!Array.isArray(operations)) {
    return false;
  }

  return operations.some(
    (operation) =>
      Boolean(
        operation &&
          typeof operation === "object" &&
          normalizeAiDocumentEditOperationType((operation as { type?: string }).type),
      ),
  );
}
