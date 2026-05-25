import type { LocalAiDocumentBlock } from "@/features/editor/lib/ai-chat-document-edit-types";
import { findTargetTextRanges } from "@/features/editor/lib/ai-chat-document-edit-ranges";

export function blockTextHasMarks(
  block: LocalAiDocumentBlock | undefined,
  targetText: string | undefined,
  marks: string | string[] | undefined,
  shouldHaveMarks: boolean,
) {
  const markNames = [marks].flat().filter((mark): mark is string => Boolean(mark));

  if (!block || !targetText || !markNames.length) {
    return false;
  }

  return findTargetTextRanges(block, targetText).some((range) =>
    markNames.every((markName) => rangeHasMark(block, range, markName) === shouldHaveMarks),
  );
}

export function blockTextHasLink(
  block: LocalAiDocumentBlock | undefined,
  targetText: string | undefined,
  href: string | undefined,
  shouldHaveLink: boolean,
) {
  if (!block || !targetText) {
    return false;
  }

  return findTargetTextRanges(block, targetText).some((range) =>
    rangeHasLink(block, range, href) === shouldHaveLink,
  );
}

function rangeHasMark(
  block: LocalAiDocumentBlock,
  range: { from: number; to: number },
  markName: string,
) {
  return getTextNodesInRange(block, range).every((node) =>
    node.marks.some((mark) => mark.type.name === markName),
  );
}

function rangeHasLink(
  block: LocalAiDocumentBlock,
  range: { from: number; to: number },
  href: string | undefined,
) {
  return getTextNodesInRange(block, range).every((node) =>
    node.marks.some(
      (mark) => mark.type.name === "link" && (!href || mark.attrs.href === href),
    ),
  );
}

function getTextNodesInRange(
  block: LocalAiDocumentBlock,
  range: { from: number; to: number },
) {
  const nodes: Array<{ marks: readonly { attrs: Record<string, unknown>; type: { name: string } }[] }> = [];

  block.node.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }

    const from = block.pos + 1 + pos;
    const to = from + node.text.length;

    if (from < range.to && to > range.from) {
      nodes.push({ marks: node.marks });
    }
  });

  return nodes;
}
