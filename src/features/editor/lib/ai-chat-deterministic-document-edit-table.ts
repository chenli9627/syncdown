import type { AiChatDocumentBlock } from "@/features/app-state/types";
import type { AiDocumentEditPayload } from "@/features/editor/lib/ai-chat-document-edit-types";
import {
  cleanTarget,
  cleanValue,
} from "@/features/editor/lib/ai-chat-deterministic-document-edit-utils";
import { buildTableColumnEditPayload } from "@/features/editor/lib/ai-chat-deterministic-document-edit-table-column";
import { buildTableRowEditPayload } from "@/features/editor/lib/ai-chat-deterministic-document-edit-table-row";
import {
  findTableColumnIndex,
  findTableRowIndex,
  getParsedTables,
  parseTableIndex,
} from "@/features/editor/lib/ai-chat-table-matrix";

export function buildTableCellUpdatePayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const tables = getParsedTables(documentBlocks);

  return (
    buildTableRowEditPayload(prompt, tables) ??
    buildTableColumnEditPayload(prompt, tables) ??
    buildExplicitTableCellUpdatePayload(prompt, tables) ??
    buildLabeledTableCellUpdatePayload(prompt, tables)
  );
}

function buildExplicitTableCellUpdatePayload(prompt: string, tables: ReturnType<typeof getParsedTables>) {
  const match = prompt.match(
    /(?:表格|行程表)?第([0-9一二三四五六七八九十两]{1,4})行第([0-9一二三四五六七八九十两]{1,4})列(?:[^,\uff0c\u3002\uff01\uff1f]{0,24})?(?:改成|改为|替换成|替换为|更新为|设为|设置为)\s*([^\n]{1,120})/iu,
  );
  const row = parseTableIndex(match?.[1]);
  const column = parseTableIndex(match?.[2]);
  const content = cleanValue(match?.[3]);

  if (!row || !column || !content) {
    return null;
  }

  const table = tables.find((candidate) => candidate.rows[row - 1]?.[column - 1] != null);
  return table
    ? {
        operations: [{ blockId: table.block.id, column, content, row, type: "update_table_cell" }],
        summary: `已更新表格第 ${row} 行第 ${column} 列。`,
      }
    : null;
}

function buildLabeledTableCellUpdatePayload(prompt: string, tables: ReturnType<typeof getParsedTables>) {
  const match = prompt.match(
    /(?:把|将)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,40}?)\s*的\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,24}?)\s*(?:改成|改为|替换成|替换为|更新为|设为|设置为)\s*([^\n]{1,120})/u,
  );
  const rowLabel = cleanTarget(match?.[1]);
  const columnLabel = cleanTarget(match?.[2]);
  const content = cleanValue(match?.[3]);

  if (!rowLabel || !columnLabel || !content) {
    return null;
  }

  for (const table of tables) {
    const column = findTableColumnIndex(table.rows[0] ?? [], columnLabel);
    const row = findTableRowIndex(table.rows, rowLabel);
    if (column && row) {
      return {
        operations: [{ blockId: table.block.id, column, content, row, type: "update_table_cell" }],
        summary: `已更新表格中“${rowLabel}”这一行的“${columnLabel}”单元格。`,
      };
    }
  }

  return null;
}
