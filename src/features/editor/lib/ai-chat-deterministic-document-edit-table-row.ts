import type { AiDocumentEditPayload } from "@/features/editor/lib/ai-chat-document-edit-types";
import { cleanTarget } from "@/features/editor/lib/ai-chat-deterministic-document-edit-utils";
import {
  cloneTableRows,
  findTableRowIndex,
  parseTableIndex,
  toMarkdownTable,
  type ParsedAiTable,
} from "@/features/editor/lib/ai-chat-table-matrix";
import {
  extractStructuredValues,
  splitStructuredValues,
  toSizedCells,
} from "@/features/editor/lib/ai-chat-deterministic-document-edit-table-content";

export function buildTableRowEditPayload(prompt: string, tables: ParsedAiTable[]) {
  return (
    buildTableRowDeletePayload(prompt, tables) ??
    buildTableRowInsertPayload(prompt, tables) ??
    buildTableRowReplacePayload(prompt, tables)
  );
}

function buildTableRowDeletePayload(prompt: string, tables: ParsedAiTable[]): AiDocumentEditPayload | null {
  const compactPrompt = prompt.replace(/\s+/g, "");

  if (/(?:删除|移除|删掉|去掉)(?:表格?|这个表格?|该表格?)?(?:的)?(?:最后|末尾)一行/u.test(compactPrompt)) {
    const table = tables.at(-1);
    const row = table?.rows.length ?? 0;
    return table && row >= 2
      ? { operations: [{ blockId: table.block.id, row, type: "delete_table_row" }], summary: "已删除表格最后一行。" }
      : null;
  }

  const explicitMatch = prompt.match(
    /(?:删除|移除|删掉|去掉)(?:表格?|这个表格?|该表格?)?(?:的)?第([0-9一二三四五六七八九十两]{1,4})行/u,
  );
  const explicitRow = parseTableIndex(explicitMatch?.[1]);
  const explicitTable = explicitRow
    ? tables.find((table) => table.rows[explicitRow - 1] != null)
    : null;
  if (explicitTable && explicitRow) {
    return {
      operations: [{ blockId: explicitTable.block.id, row: explicitRow, type: "delete_table_row" }],
      summary: `已删除表格第 ${explicitRow} 行。`,
    };
  }

  const labelMatch =
    prompt.match(/(?:删除|移除|删掉|去掉)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,40}?)\s*(?:所在的行|这一行|这行)/u) ??
    prompt.match(/(?:把|将)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,40}?)\s*(?:所在的行|这一行|这行)\s*(?:删除|移除|删掉|去掉)/u);
  const rowLabel = cleanTarget(labelMatch?.[1]);

  for (const table of tables) {
    const row = rowLabel ? findTableRowIndex(table.rows, rowLabel) : 0;
    if (row > 1) {
      return {
        operations: [{ blockId: table.block.id, row, type: "delete_table_row" }],
        summary: `已删除表格中“${rowLabel}”所在的行。`,
      };
    }
  }

  return null;
}

function buildTableRowInsertPayload(prompt: string, tables: ParsedAiTable[]): AiDocumentEditPayload | null {
  if (!/(?:新增|添加|插入|补充|追加).{0,12}(?:一)?行/u.test(prompt)) {
    return null;
  }

  const resolved = resolveRowTarget(prompt, tables);
  if (!resolved) {
    return null;
  }

  const values = toSizedCells(extractStructuredValues(prompt), resolved.table.rows[0]?.length ?? 0);
  const nextRows = cloneTableRows(resolved.table.rows);
  nextRows.splice(resolved.index, 0, values);

  return {
    operations: [{ blockId: resolved.table.block.id, content: toMarkdownTable(nextRows), type: "replace_block" }],
    summary: resolved.label
      ? `已在“${resolved.label}”所在行${resolved.placement === "before" ? "前" : "后"}新增一行。`
      : "已在表格中新增一行。",
  };
}

function buildTableRowReplacePayload(prompt: string, tables: ParsedAiTable[]): AiDocumentEditPayload | null {
  const match =
    prompt.match(/(?:把|将)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,40}?)\s*(?:这一行|这行|所在的行)\s*(?:改成|改为|替换成|替换为|更新为)\s*([^\n]{1,200})/u) ??
    prompt.match(/(?:把|将)\s*第([0-9一二三四五六七八九十两]{1,4})行\s*(?:改成|改为|替换成|替换为|更新为)\s*([^\n]{1,200})/u);
  const rowLabel = cleanTarget(match?.[1]);
  const replacement = match?.[2];

  if (!replacement) {
    return null;
  }

  for (const table of tables) {
    const row = rowLabel
      ? /^\d+$|^[一二三四五六七八九十两]+$/u.test(rowLabel)
        ? parseTableIndex(rowLabel) ?? 0
        : findTableRowIndex(table.rows, rowLabel)
      : 0;
    if (!row || !table.rows[row - 1]) {
      continue;
    }
    const nextRows = cloneTableRows(table.rows);
    nextRows[row - 1] = toSizedCells(splitStructuredValues(replacement), nextRows[0]?.length ?? 0);
    return {
      operations: [{ blockId: table.block.id, content: toMarkdownTable(nextRows), type: "replace_block" }],
      summary: `已更新表格第 ${row} 行的内容。`,
    };
  }

  return null;
}

function resolveRowTarget(prompt: string, tables: ParsedAiTable[]) {
  const explicitMatch = prompt.match(/第([0-9一二三四五六七八九十两]{1,4})行(?:的)?(前面|后面|之前|之后)?/u);
  const explicitRow = parseTableIndex(explicitMatch?.[1]);
  const explicitPlacement = /前/u.test(explicitMatch?.[2] ?? "") ? "before" : "after";

  if (explicitRow) {
    const table = tables.find((candidate) => candidate.rows[explicitRow - 1] != null);
    if (table) {
      return { index: explicitPlacement === "before" ? explicitRow - 1 : explicitRow, label: `第 ${explicitRow} 行`, placement: explicitPlacement, table };
    }
  }

  const labelMatch = prompt.match(
    /(?:在|把|将)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,40}?)\s*(?:所在的行|这一行|这行)?\s*(前面|后面|之前|之后)?\s*(?:新增|添加|插入|补充|追加)/u,
  );
  const rowLabel = cleanTarget(labelMatch?.[1]);
  const labelPlacement = /前/u.test(labelMatch?.[2] ?? "") ? "before" : "after";

  for (const table of tables) {
    const row = rowLabel ? findTableRowIndex(table.rows, rowLabel) : 0;
    if (row) {
      return {
        index: labelPlacement === "before" ? row - 1 : row,
        label: rowLabel,
        placement: labelPlacement,
        table,
      };
    }
  }

  const table = tables.at(-1);
  return table
    ? { index: table.rows.length, label: "", placement: "after" as const, table }
    : null;
}
