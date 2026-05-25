import type { AiChatDocumentBlock } from "@/features/app-state/types";

export function getSectionBlockIds(
  documentBlocks: AiChatDocumentBlock[],
  headingBlockId: string,
) {
  const headingIndex = documentBlocks.findIndex((block) => block.id === headingBlockId);
  const headingBlock = documentBlocks[headingIndex];

  if (headingIndex < 0 || headingBlock?.type !== "heading") {
    return [];
  }

  const blockIds = [headingBlock.id];
  const currentLevel = headingBlock.level ?? 1;

  for (let index = headingIndex + 1; index < documentBlocks.length; index += 1) {
    const block = documentBlocks[index];

    if (!block) {
      continue;
    }

    if (block.type === "heading" && (block.level ?? 1) <= currentLevel) {
      break;
    }

    blockIds.push(block.id);
  }

  return blockIds;
}

export function findLastBlockOfTypes(documentBlocks: AiChatDocumentBlock[], types: string[]) {
  for (let index = documentBlocks.length - 1; index >= 0; index -= 1) {
    const block = documentBlocks[index];

    if (block && types.includes(block.type)) {
      return block;
    }
  }

  return null;
}

export function findLastBlocksOfTypes(
  documentBlocks: AiChatDocumentBlock[],
  types: string[],
  count: number,
) {
  const blocks: AiChatDocumentBlock[] = [];

  for (let index = documentBlocks.length - 1; index >= 0 && blocks.length < count; index -= 1) {
    const block = documentBlocks[index];

    if (block && types.includes(block.type)) {
      blocks.unshift(block);
    }
  }

  return blocks;
}
