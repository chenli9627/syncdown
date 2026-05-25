import type {
  AiDocumentEditOperation,
  LocalAiDocumentBlock,
} from "@/features/editor/lib/ai-chat-document-edit-types";
import {
  getExpectedContentSegments,
  getExpectedContentText,
} from "@/features/editor/lib/ai-chat-document-edit-verification-content";

export function blocksContainText(blocks: LocalAiDocumentBlock[], expectedText: string) {
  return Boolean(expectedText && blocks.some((block) => blockContainsText(block, expectedText)));
}

export function blocksContainInsertedContent(
  blocks: LocalAiDocumentBlock[],
  content: string | undefined,
) {
  const expectedText = getExpectedContentText(content);

  if (blocksContainText(blocks, expectedText)) {
    return true;
  }

  const documentText = blocks.map((block) => block.text).join("\n");
  const segments = getExpectedContentSegments(content);

  return Boolean(
    segments.length &&
      segments.every(
        (segment) =>
          blocksContainText(blocks, segment) ||
          documentTextContainsSegment(documentText, segment),
      ),
  );
}

export function blockContainsText(
  block: LocalAiDocumentBlock | undefined,
  expectedText: string,
) {
  if (!expectedText || !block?.text) {
    return false;
  }

  if (block.text.includes(expectedText)) {
    return true;
  }

  const excerpt = getStableSegmentExcerpt(expectedText);
  const compactBlockText = toCompactComparableText(block.text);
  const compactExpectedText = toCompactComparableText(expectedText);
  const compactExcerpt = toCompactComparableText(excerpt);
  const looseBlockText = toLooseComparableText(block.text);
  const looseExpectedText = toLooseComparableText(expectedText);
  const looseExcerpt = toLooseComparableText(excerpt);

  return Boolean(
    (compactExpectedText && compactBlockText.includes(compactExpectedText)) ||
      (compactExcerpt && compactBlockText.includes(compactExcerpt)) ||
      (looseExpectedText && looseBlockText.includes(looseExpectedText)) ||
      (looseExcerpt && looseBlockText.includes(looseExcerpt)),
  );
}

export function blockContainsContent(
  block: LocalAiDocumentBlock | undefined,
  content: string | undefined,
) {
  const expectedText = getExpectedContentText(content);

  if (blockContainsText(block, expectedText)) {
    return true;
  }

  const segments = getExpectedContentSegments(content);
  return Boolean(segments.length && segments.every((segment) => blockContainsText(block, segment)));
}

export function verifyBlockPlacementOperation(
  operation: AiDocumentEditOperation,
  beforeBlocks: LocalAiDocumentBlock[],
  afterBlocks: LocalAiDocumentBlock[],
) {
  const beforeBlock = beforeBlocks.find((block) => block.id === operation.blockId);
  const beforeTargetBlock = beforeBlocks.find((block) => block.id === operation.targetBlockId);

  if (!beforeBlock?.text || !beforeTargetBlock?.text) {
    return false;
  }

  const afterBlockIndex = findMatchingBlockIndex(afterBlocks, beforeBlock);
  const afterTargetIndex = findMatchingBlockIndex(afterBlocks, beforeTargetBlock);

  if (afterBlockIndex < 0 || afterTargetIndex < 0) {
    return false;
  }

  return operation.placement === "before"
    ? afterBlockIndex < afterTargetIndex
    : afterBlockIndex > afterTargetIndex;
}

function documentTextContainsSegment(documentText: string, segment: string) {
  if (!documentText || !segment) {
    return false;
  }

  if (documentText.includes(segment)) {
    return true;
  }

  const excerpt = getStableSegmentExcerpt(segment);

  if (excerpt && documentText.includes(excerpt)) {
    return true;
  }

  const compactDocumentText = toCompactComparableText(documentText);
  const compactSegment = toCompactComparableText(segment);
  const compactExcerpt = toCompactComparableText(excerpt);
  const looseDocumentText = toLooseComparableText(documentText);
  const looseSegment = toLooseComparableText(segment);
  const looseExcerpt = toLooseComparableText(excerpt);

  return Boolean(
    (compactSegment && compactDocumentText.includes(compactSegment)) ||
      (compactExcerpt && compactDocumentText.includes(compactExcerpt)) ||
      (looseSegment && looseDocumentText.includes(looseSegment)) ||
      (looseExcerpt && looseDocumentText.includes(looseExcerpt)),
  );
}

function getStableSegmentExcerpt(segment: string) {
  const cleanSegment = segment.trim();

  if (cleanSegment.length <= 120) {
    return cleanSegment;
  }

  return cleanSegment.slice(0, 80).trim();
}

function toCompactComparableText(text: string) {
  return text.replace(/[\s|:："'“”‘’`]+/g, "").trim();
}

function toLooseComparableText(text: string) {
  return text.replace(/[\p{P}\p{S}\s]+/gu, "").trim();
}

function findMatchingBlockIndex(
  blocks: LocalAiDocumentBlock[],
  expectedBlock: LocalAiDocumentBlock,
) {
  return blocks.findIndex(
    (block) =>
      block.text === expectedBlock.text &&
      block.type === expectedBlock.type &&
      block.level === expectedBlock.level,
  );
}
