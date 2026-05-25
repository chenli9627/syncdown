import type { AiChatDocumentBlock } from "@/features/app-state/types";

export type ParsedAiTable = {
  block: AiChatDocumentBlock;
  rows: string[][];
};

const CHINESE_NUMBER_MAP: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  两: 2,
};

export function getParsedTables(blocks: AiChatDocumentBlock[]) {
  return blocks
    .map((block) => parseTableBlock(block))
    .filter((table): table is ParsedAiTable => Boolean(table));
}

export function parseTableBlock(block: AiChatDocumentBlock): ParsedAiTable | null {
  if (block.type !== "table") {
    return null;
  }

  const rows = parseTableRows(block.html ?? "");
  return rows.length ? { block, rows } : null;
}

export function parseTableRows(html: string) {
  const rowMatches = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  return rowMatches.map((rowMatch) =>
    [...rowMatch[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cellMatch) =>
      decodeHtmlEntities(stripTags(cellMatch[1])).trim(),
    ),
  );
}

export function toMarkdownTable(rows: string[][]) {
  const headerRow = rows[0] ?? [];
  const separatorRow = headerRow.map(() => "---");
  const bodyRows = rows.slice(1);
  return [headerRow, separatorRow, ...bodyRows]
    .map((row) => `| ${row.map(escapeMarkdownTableCell).join(" | ")} |`)
    .join("\n");
}

export function cloneTableRows(rows: string[][]) {
  return rows.map((row) => [...row]);
}

export function findTableColumnIndex(headerRow: string[], columnLabel: string) {
  const normalizedTarget = normalizeTableCell(columnLabel);
  const exactIndex = headerRow.findIndex(
    (cell) => normalizeTableCell(cell) === normalizedTarget,
  );

  if (exactIndex >= 0) {
    return exactIndex + 1;
  }

  const fuzzyIndex = headerRow.findIndex((cell) =>
    normalizeTableCell(cell).includes(normalizedTarget),
  );
  return fuzzyIndex >= 0 ? fuzzyIndex + 1 : 0;
}

export function findTableRowIndex(rows: string[][], rowLabel: string) {
  const normalizedTarget = normalizeTableCell(rowLabel);
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index]?.some((cell) => normalizeTableCell(cell) === normalizedTarget)) {
      return index + 1;
    }
  }

  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index]?.some((cell) => normalizeTableCell(cell).includes(normalizedTarget))) {
      return index + 1;
    }
  }

  return 0;
}

export function normalizeTableCell(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function parseTableIndex(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  if (trimmed === "十") {
    return 10;
  }

  if (trimmed.endsWith("十")) {
    const tens = CHINESE_NUMBER_MAP[trimmed.slice(0, -1)] ?? 0;
    return tens > 0 ? tens * 10 : null;
  }

  if (trimmed.startsWith("十")) {
    const ones = CHINESE_NUMBER_MAP[trimmed.slice(1)] ?? 0;
    return 10 + ones;
  }

  const [tensText, onesText] = trimmed.split("十");

  if (onesText != null) {
    const tens = CHINESE_NUMBER_MAP[tensText] ?? 0;
    const ones = CHINESE_NUMBER_MAP[onesText] ?? 0;
    return tens > 0 ? tens * 10 + ones : null;
  }

  return CHINESE_NUMBER_MAP[trimmed] ?? null;
}

function escapeMarkdownTableCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
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
