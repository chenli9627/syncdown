import type { AiChatDocumentBlock } from "@/features/app-state/types";
import type { AiDocumentEditPayload } from "@/features/editor/lib/ai-chat-document-edit-types";
import {
  cleanTarget,
  cleanValue,
  normalizeComparable,
  toHeadingLevel,
} from "@/features/editor/lib/ai-chat-deterministic-document-edit-utils";

type ParsedTable = {
  block: AiChatDocumentBlock;
  rows: string[][];
};

export function buildTableCellUpdatePayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const explicitMatch = prompt.match(
    /(?:表格|行程表)?第([1-6\u4e00\u4e8c\u4e09\u56db\u4e94\u516d])行第([1-6\u4e00\u4e8c\u4e09\u56db\u4e94\u516d])列(?:[^,\uff0c\u3002\uff01\uff1f]{0,24})?(?:\u6539\u6210|\u6539\u4e3a|\u66ff\u6362\u6210|\u66ff\u6362\u4e3a|\u66f4\u65b0\u4e3a|\u8bbe\u4e3a|\u8bbe\u7f6e\u4e3a)\s*([^\n]{1,120})/iu,
  );
  if (explicitMatch) {
    const row = toHeadingLevel(explicitMatch[1]);
    const column = toHeadingLevel(explicitMatch[2]);
    const content = cleanValue(explicitMatch[3]);
    if (!row || !column || !content) {
      return null;
    }
    const table = getParsedTables(documentBlocks).find(
      (candidate) => candidate.rows[row - 1]?.[column - 1] != null,
    );
    if (!table) {
      return null;
    }
    return {
      operations: [
        { blockId: table.block.id, column, content, row, type: "update_table_cell" },
      ],
      summary: `已更新表格第 ${row} 行第 ${column} 列。`,
    };
  }

  const labelMatch = prompt.match(
    /(?:\u628a|\u5c06)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,40}?)\s*\u7684\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,24}?)\s*(?:\u6539\u6210|\u6539\u4e3a|\u66ff\u6362\u6210|\u66ff\u6362\u4e3a|\u66f4\u65b0\u4e3a|\u8bbe\u4e3a|\u8bbe\u7f6e\u4e3a)\s*([^\n]{1,120})/u,
  );
  if (!labelMatch) {
    return null;
  }

  const rowLabel = cleanTarget(labelMatch[1]);
  const columnLabel = cleanTarget(labelMatch[2]);
  const content = cleanValue(labelMatch[3]);
  if (!rowLabel || !columnLabel || !content) {
    return null;
  }

  for (const table of getParsedTables(documentBlocks)) {
    const column = findTableColumnIndex(table.rows[0] ?? [], columnLabel);
    const row = findTableRowIndex(table.rows, rowLabel);
    if (column && row) {
      return {
        operations: [
          { blockId: table.block.id, column, content, row, type: "update_table_cell" },
        ],
        summary: `已更新表格中“${rowLabel}”这一行的“${columnLabel}”单元格。`,
      };
    }
  }

  return null;
}

function getParsedTables(blocks: AiChatDocumentBlock[]) {
  return blocks
    .filter((block) => block.type === "table")
    .map((block) => ({ block, rows: parseTableRows(block) }))
    .filter((table): table is ParsedTable => table.rows.length > 0);
}

function parseTableRows(block: AiChatDocumentBlock) {
  const html = block.html ?? "";
  const rowMatches = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  return rowMatches.map((rowMatch) =>
    [...rowMatch[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cellMatch) =>
      decodeHtmlEntities(stripTags(cellMatch[1])).trim(),
    ),
  );
}

function findTableColumnIndex(headerRow: string[], columnLabel: string) {
  const normalizedTarget = normalizeComparable(columnLabel);
  const index = headerRow.findIndex((cell) => normalizeComparable(cell) === normalizedTarget);
  return index >= 0 ? index + 1 : 0;
}

function findTableRowIndex(rows: string[][], rowLabel: string) {
  const normalizedTarget = normalizeComparable(rowLabel);
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index]?.some((cell) => normalizeComparable(cell) === normalizedTarget)) {
      return index + 1;
    }
  }
  return 0;
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, "");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}
