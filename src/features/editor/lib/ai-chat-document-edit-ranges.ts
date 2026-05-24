import type { LocalAiDocumentBlock } from "@/features/editor/lib/ai-chat-document-edit-types";

export type NestedNodeRange = {
  attrs: Record<string, unknown>;
  from: number;
  to: number;
  typeName: string;
};

export function findTargetTextRange(
  block: LocalAiDocumentBlock,
  targetText: string | undefined,
) {
  return findTargetTextRanges(block, targetText)[0] ?? null;
}

export function findTargetTextRanges(
  block: LocalAiDocumentBlock,
  targetText: string | undefined,
) {
  return targetText ? findTextRangesInBlock(block, targetText) : [];
}

export function findTableCellContentRange(
  block: LocalAiDocumentBlock,
  row: number | undefined,
  column: number | undefined,
): { from: number; to: number } | null {
  if (block.node.type.name !== "table" || !isPositiveInteger(row) || !isPositiveInteger(column)) {
    return null;
  }

  let range: { from: number; to: number } | null = null;

  block.node.forEach((rowNode, rowOffset, rowIndex) => {
    if (range || rowNode.type.name !== "tableRow" || rowIndex + 1 !== row) {
      return;
    }

    rowNode.forEach((cellNode, cellOffset, cellIndex) => {
      if (
        range ||
        (cellNode.type.name !== "tableCell" && cellNode.type.name !== "tableHeader") ||
        cellIndex + 1 !== column
      ) {
        return;
      }

      const cellPosition = block.pos + 2 + rowOffset + cellOffset;
      range = {
        from: cellPosition + 1,
        to: cellPosition + cellNode.nodeSize - 1,
      };
    });
  });

  return range;
}

export function findTaskItemRange(
  block: LocalAiDocumentBlock,
  targetText: string | undefined,
): NestedNodeRange | null {
  return findDescendantRange(block, "taskItem", targetText);
}

export function findTableRowRange(
  block: LocalAiDocumentBlock,
  row: number | undefined,
): NestedNodeRange | null {
  if (block.node.type.name !== "table" || !isPositiveInteger(row)) {
    return null;
  }

  let range: NestedNodeRange | null = null;

  block.node.forEach((rowNode, rowOffset, rowIndex) => {
    if (range || rowNode.type.name !== "tableRow" || rowIndex + 1 !== row) {
      return;
    }

    range = {
      attrs: rowNode.attrs,
      from: block.pos + 1 + rowOffset,
      to: block.pos + 1 + rowOffset + rowNode.nodeSize,
      typeName: rowNode.type.name,
    };
  });

  return range;
}

export function findTableColumnRanges(
  block: LocalAiDocumentBlock,
  column: number | undefined,
): NestedNodeRange[] {
  if (block.node.type.name !== "table" || !isPositiveInteger(column)) {
    return [];
  }

  const ranges: NestedNodeRange[] = [];

  block.node.forEach((rowNode, rowOffset) => {
    if (rowNode.type.name !== "tableRow") {
      return;
    }

    rowNode.forEach((cellNode, cellOffset, cellIndex) => {
      if (
        cellIndex + 1 !== column ||
        (cellNode.type.name !== "tableCell" && cellNode.type.name !== "tableHeader")
      ) {
        return;
      }

      ranges.push({
        attrs: cellNode.attrs,
        from: block.pos + 2 + rowOffset + cellOffset,
        to: block.pos + 2 + rowOffset + cellOffset + cellNode.nodeSize,
        typeName: cellNode.type.name,
      });
    });
  });

  return ranges;
}

function findDescendantRange(
  block: LocalAiDocumentBlock,
  typeName: string,
  targetText: string | undefined,
) {
  let range: NestedNodeRange | null = null;

  block.node.descendants((node, pos) => {
    if (range || node.type.name !== typeName) {
      return;
    }

    if (targetText && !node.textContent.includes(targetText)) {
      return;
    }

    range = {
      attrs: node.attrs,
      from: block.pos + 1 + pos,
      to: block.pos + 1 + pos + node.nodeSize,
      typeName: node.type.name,
    };
  });

  return range;
}

function findTextRangesInBlock(block: LocalAiDocumentBlock, targetText: string) {
  const segments: Array<{
    from: number;
    textEnd: number;
    textStart: number;
    to: number;
  }> = [];
  let blockText = "";

  block.node.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }

    const textStart = blockText.length;
    blockText += node.text;
    segments.push({
      from: block.pos + 1 + pos,
      textEnd: blockText.length,
      textStart,
      to: block.pos + 1 + pos + node.text.length,
    });
  });

  const ranges: Array<{ from: number; to: number }> = [];
  let targetStart = blockText.indexOf(targetText);

  while (targetStart >= 0) {
    const targetEnd = targetStart + targetText.length;
    const startSegment = segments.find(
      (segment) => segment.textStart <= targetStart && targetStart < segment.textEnd,
    );
    const endSegment = segments.find(
      (segment) => segment.textStart < targetEnd && targetEnd <= segment.textEnd,
    );

    if (startSegment && endSegment) {
      ranges.push({
        from: startSegment.from + targetStart - startSegment.textStart,
        to: endSegment.from + targetEnd - endSegment.textStart,
      });
    }

    targetStart = blockText.indexOf(targetText, targetEnd);
  }

  return ranges;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}
