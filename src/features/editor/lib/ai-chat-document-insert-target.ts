import type { AiChatDocumentBlock } from "@/features/app-state/types";
import { cleanTarget, findSingleBlockContaining } from "@/features/editor/lib/ai-chat-deterministic-document-edit-utils";

type InsertTarget = {
  blockId: string;
  locationLabel: string;
  operationType: "insert_after_block" | "insert_before_block";
};

export function resolveAiChatDocumentInsertTarget(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): InsertTarget | null {
  if (!documentBlocks.length) {
    return null;
  }

  const specificTarget = resolveSpecificInsertTarget(prompt, documentBlocks);

  if (specificTarget) {
    return specificTarget;
  }

  const endBlock = findLastNonEmptyBlock(documentBlocks);

  return endBlock
    ? {
        blockId: endBlock.id,
        locationLabel: "文档末尾",
        operationType: "insert_after_block",
      }
    : null;
}

function resolveSpecificInsertTarget(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): InsertTarget | null {
  const compactPrompt = prompt.replace(/\s+/g, "");

  if (/(?:文档末尾|文末|最后|结尾|底部)/u.test(compactPrompt)) {
    const block = findLastNonEmptyBlock(documentBlocks);

    return block
      ? {
          blockId: block.id,
          locationLabel: "文档末尾",
          operationType: "insert_after_block" as const,
        }
      : null;
  }

  if (/(?:文档开头|文首|开头|顶部)/u.test(compactPrompt)) {
    const block = documentBlocks[0];

    return block
      ? {
          blockId: block.id,
          locationLabel: "文档开头",
          operationType: "insert_before_block" as const,
        }
      : null;
  }

  const match =
    prompt.match(
      /(?:在)\s*([^\n，。！？]{1,96}?)\s*(上面|前面|之前|下面|后面|之后|下方|上方)\s*(?:插入|添加|加入|放入|放到|写入)/u,
    ) ??
    prompt.match(
      /(?:把|将).{0,24}(?:插入|添加|加入|放入|放到|写入).{0,24}(?:在)\s*([^\n，。！？]{1,96}?)\s*(上面|前面|之前|下面|后面|之后|下方|上方)/u,
    ) ??
    prompt.match(
      /(?:在)\s*([^\n，。！？]{1,96}?)\s*(?:下面|后面|之后|下方)\s*(?:加上|补上|补充|新增)/u,
    );

  const anchor = cleanTarget(match?.[1]);
  const placement = resolvePlacement(match?.[2] ?? "");

  if (!anchor || !placement) {
    return null;
  }

  const block = findSingleBlockContaining(documentBlocks, anchor);

  if (!block) {
    return null;
  }

  return {
    blockId: block.id,
    locationLabel: `${anchor}${placement === "before" ? "前面" : "后面"}`,
    operationType:
      placement === "before"
        ? ("insert_before_block" as const)
        : ("insert_after_block" as const),
  };
}

function findLastNonEmptyBlock(documentBlocks: AiChatDocumentBlock[]) {
  for (let index = documentBlocks.length - 1; index >= 0; index -= 1) {
    const block = documentBlocks[index];

    if (block?.text.trim()) {
      return block;
    }
  }

  return documentBlocks[documentBlocks.length - 1] ?? null;
}

function resolvePlacement(value: string) {
  if (/(?:上面|前面|之前|上方)/u.test(value)) {
    return "before";
  }

  if (/(?:下面|后面|之后|下方)/u.test(value)) {
    return "after";
  }

  return null;
}
