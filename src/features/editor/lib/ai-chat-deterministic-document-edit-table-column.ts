import type { AiDocumentEditPayload } from "@/features/editor/lib/ai-chat-document-edit-types";
import {
  cleanTarget,
  cleanValue,
} from "@/features/editor/lib/ai-chat-deterministic-document-edit-utils";
import {
  cloneTableRows,
  findTableColumnIndex,
  parseTableIndex,
  toMarkdownTable,
  type ParsedAiTable,
} from "@/features/editor/lib/ai-chat-table-matrix";
import {
  extractStructuredValues,
  splitStructuredValues,
  toColumnValues,
} from "@/features/editor/lib/ai-chat-deterministic-document-edit-table-content";

export function buildTableColumnEditPayload(prompt: string, tables: ParsedAiTable[]) {
  return (
    buildTableColumnDeletePayload(prompt, tables) ??
    buildTableColumnInsertPayload(prompt, tables) ??
    buildTableHeaderRenamePayload(prompt, tables) ??
    buildTableColumnFillPayload(prompt, tables)
  );
}

function buildTableColumnDeletePayload(prompt: string, tables: ParsedAiTable[]): AiDocumentEditPayload | null {
  const compactPrompt = prompt.replace(/\s+/g, "");
  if (/(?:删除|移除|删掉|去掉)(?:表格?|这个表格?|该表格?)?(?:的)?(?:最后|末尾)一列/u.test(compactPrompt)) {
    const table = tables.at(-1);
    const column = table?.rows[0]?.length ?? 0;
    return table && column > 0
      ? { operations: [{ blockId: table.block.id, column, type: "delete_table_column" }], summary: "已删除表格最后一列。" }
      : null;
  }

  const explicitMatch = prompt.match(
    /(?:删除|移除|删掉|去掉)(?:表格?|这个表格?|该表格?)?(?:的)?第([0-9一二三四五六七八九十两]{1,4})列/u,
  );
  const explicitColumn = parseTableIndex(explicitMatch?.[1]);
  const explicitTable = explicitColumn
    ? tables.find((table) => table.rows[0]?.[explicitColumn - 1] != null)
    : null;
  if (explicitTable && explicitColumn) {
    return {
      operations: [{ blockId: explicitTable.block.id, column: explicitColumn, type: "delete_table_column" }],
      summary: `已删除表格第 ${explicitColumn} 列。`,
    };
  }

  const labelMatch =
    prompt.match(/(?:删除|移除|删掉|去掉)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,40}?)\s*列/u) ??
    prompt.match(/(?:把|将)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,40}?)\s*列\s*(?:删除|移除|删掉|去掉)/u);
  const columnLabel = cleanTarget(labelMatch?.[1]);

  for (const table of tables) {
    const column = columnLabel ? findTableColumnIndex(table.rows[0] ?? [], columnLabel) : 0;
    if (column) {
      return {
        operations: [{ blockId: table.block.id, column, type: "delete_table_column" }],
        summary: `已删除表格中的“${columnLabel}”列。`,
      };
    }
  }

  return null;
}

function buildTableColumnInsertPayload(prompt: string, tables: ParsedAiTable[]): AiDocumentEditPayload | null {
  if (!/(?:新增|添加|插入|补充|追加).{0,12}(?:一)?列/u.test(prompt)) {
    return null;
  }

  const resolved = resolveColumnTarget(prompt, tables);
  if (!resolved) {
    return null;
  }

  const header = extractColumnHeader(prompt);
  const bodyValues = toColumnValues(extractStructuredValues(prompt), resolved.table.rows.length - 1);
  const nextRows = cloneTableRows(resolved.table.rows);
  nextRows.forEach((row, rowIndex) =>
    row.splice(resolved.index, 0, rowIndex === 0 ? header : bodyValues[rowIndex - 1]),
  );

  return {
    operations: [{ blockId: resolved.table.block.id, content: toMarkdownTable(nextRows), type: "replace_block" }],
    summary: header ? `已新增一列“${header}”。` : "已在表格中新增一列。",
  };
}

function buildTableHeaderRenamePayload(prompt: string, tables: ParsedAiTable[]): AiDocumentEditPayload | null {
  const match = prompt.match(
    /(?:把|将)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,40}?)\s*列(?:标题)?\s*(?:改成|改为|替换成|替换为|重命名为)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,40})/u,
  );
  const columnLabel = cleanTarget(match?.[1]);
  const nextLabel = cleanValue(match?.[2]);

  if (!columnLabel || !nextLabel || /(?:、|,|，|；|;|\|)/u.test(nextLabel)) {
    return null;
  }

  for (const table of tables) {
    const column = findTableColumnIndex(table.rows[0] ?? [], columnLabel);
    if (!column) {
      continue;
    }
    const nextRows = cloneTableRows(table.rows);
    nextRows[0][column - 1] = nextLabel;
    return {
      operations: [{ blockId: table.block.id, content: toMarkdownTable(nextRows), type: "replace_block" }],
      summary: `已将“${columnLabel}”列改名为“${nextLabel}”。`,
    };
  }

  return null;
}

function buildTableColumnFillPayload(prompt: string, tables: ParsedAiTable[]): AiDocumentEditPayload | null {
  const match = prompt.match(
    /(?:把|将)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,40}?)\s*列(?:的内容)?\s*(?:都|全部|依次|分别)?\s*(?:填成|填为|设为|设置为|更新为|改成|改为)\s*([^\n]{1,200})/u,
  );
  const columnLabel = cleanTarget(match?.[1]);
  const content = cleanValue(match?.[2]);

  if (!columnLabel || !content) {
    return null;
  }

  for (const table of tables) {
    const column = findTableColumnIndex(table.rows[0] ?? [], columnLabel);
    if (!column) {
      continue;
    }
    const values = toColumnValues(splitStructuredValues(content), table.rows.length - 1);
    const nextRows = cloneTableRows(table.rows);
    for (let index = 1; index < nextRows.length; index += 1) {
      nextRows[index][column - 1] = values[index - 1];
    }
    return {
      operations: [{ blockId: table.block.id, content: toMarkdownTable(nextRows), type: "replace_block" }],
      summary: `已填充“${columnLabel}”列的内容。`,
    };
  }

  return null;
}

function resolveColumnTarget(prompt: string, tables: ParsedAiTable[]) {
  const explicitMatch = prompt.match(/第([0-9一二三四五六七八九十两]{1,4})列(?:的)?(前面|后面|之前|之后)?/u);
  const explicitColumn = parseTableIndex(explicitMatch?.[1]);
  const explicitPlacement = /前/u.test(explicitMatch?.[2] ?? "") ? "before" : "after";

  if (explicitColumn) {
    const table = tables.find((candidate) => candidate.rows[0]?.[explicitColumn - 1] != null);
    if (table) {
      return { index: explicitPlacement === "before" ? explicitColumn - 1 : explicitColumn, table };
    }
  }

  const labelMatch = prompt.match(
    /(?:在|把|将)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,40}?)\s*(?:列)?\s*(前面|后面|之前|之后)?\s*(?:新增|添加|插入|补充|追加)/u,
  );
  const columnLabel = cleanTarget(labelMatch?.[1]);
  const labelPlacement = /前/u.test(labelMatch?.[2] ?? "") ? "before" : "after";

  for (const table of tables) {
    const column = columnLabel ? findTableColumnIndex(table.rows[0] ?? [], columnLabel) : 0;
    if (column) {
      return { index: labelPlacement === "before" ? column - 1 : column, table };
    }
  }

  const table = tables.at(-1);
  return table ? { index: table.rows[0]?.length ?? 0, table } : null;
}

function extractColumnHeader(prompt: string) {
  const match =
    prompt.match(/(?:新增|添加|插入|补充|追加)(?:一)?列\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,40})/u) ??
    prompt.match(/(?:标题|列名)(?:是|为)?\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,40})/u);
  return cleanValue(match?.[1]);
}
