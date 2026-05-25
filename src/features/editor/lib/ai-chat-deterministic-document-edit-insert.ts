import type { AiChatDocumentBlock } from "@/features/app-state/types";
import type { AiDocumentEditPayload } from "@/features/editor/lib/ai-chat-document-edit-types";
import {
  cleanTarget,
  cleanValue,
  findSingleBlockContaining,
} from "@/features/editor/lib/ai-chat-deterministic-document-edit-utils";

export function buildExplicitInsertPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  return (
    buildStructuredHeadingInsertPayload(prompt, documentBlocks) ??
    buildLiteralInsertPayload(prompt, documentBlocks)
  );
}

function buildStructuredHeadingInsertPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const match =
    prompt.match(
      /(?:在)\s*([^\n，。！？]{1,96}?)\s*(上面|前面|下面|后面|之前|之后)\s*(?:插入|添加|加入)\s*([一二三四五六1-6])级标题[:：]\s*([^\n]{1,120})/u,
    ) ??
    prompt.match(
      /(?:在)\s*(文档末尾|文末|最后|开头|顶部)\s*(?:插入|添加|加入)\s*([一二三四五六1-6])级标题[:：]\s*([^\n]{1,120})/u,
    );

  if (!match) {
    return null;
  }

  const explicitAnchor = cleanTarget(match[1]);
  const placement = resolvePlacement(match[2] ?? "");
  const level = toHeadingLevel(match[match.length - 2]);
  const title = cleanValue(match[match.length - 1]);

  if (!level || !title) {
    return null;
  }

  const content = `${"#".repeat(level)} ${title}`;
  const location = resolveInsertLocation(documentBlocks, explicitAnchor, placement);

  return location
    ? {
        operations: [
          {
            blockId: location.blockId,
            content,
            type: location.type,
          },
        ],
        summary: `已${location.type === "insert_before_block" ? "在前面" : "在后面"}插入 ${level} 级标题“${title}”。`,
      }
    : null;
}

function buildLiteralInsertPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const match =
    prompt.match(
      /(?:在)\s*([^\n，。！？]{1,96}?)\s*(上面|前面|下面|后面|之前|之后)\s*(?:插入|添加|加入)\s*([^\n]{1,240})/u,
    ) ??
    prompt.match(
      /(?:在)\s*(文档末尾|文末|最后|开头|顶部)\s*(?:插入|添加|加入)\s*([^\n]{1,240})/u,
    );

  if (!match) {
    return null;
  }

  const explicitAnchor = cleanTarget(match[1]);
  const placement = resolvePlacement(match[2] ?? "");
  const content = cleanValue(match[match.length - 1]);

  if (!content || /^(?:一|二|三|四|五|六|1|2|3|4|5|6)级标题[:：]/u.test(content)) {
    return null;
  }

  const location = resolveInsertLocation(documentBlocks, explicitAnchor, placement);

  return location
    ? {
        operations: [
          {
            blockId: location.blockId,
            content,
            type: location.type,
          },
        ],
        summary: `已将内容插入到指定位置。`,
      }
    : null;
}

function resolveInsertLocation(
  documentBlocks: AiChatDocumentBlock[],
  explicitAnchor: string,
  placement: "before" | "after" | null,
) {
  if (/^(?:文档末尾|文末|最后)$/u.test(explicitAnchor)) {
    const block = findLastNonEmptyBlock(documentBlocks);
    return block
      ? {
          blockId: block.id,
          type: "insert_after_block" as const,
        }
      : null;
  }

  if (/^(?:开头|顶部)$/u.test(explicitAnchor)) {
    const block = documentBlocks[0];
    return block
      ? {
          blockId: block.id,
          type: "insert_before_block" as const,
        }
      : null;
  }

  const block = findSingleBlockContaining(documentBlocks, explicitAnchor);

  if (!block || !placement) {
    return null;
  }

  return {
    blockId: block.id,
    type: placement === "before" ? ("insert_before_block" as const) : ("insert_after_block" as const),
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
  if (/(?:上面|前面|之前)/u.test(value)) {
    return "before";
  }

  if (/(?:下面|后面|之后)/u.test(value)) {
    return "after";
  }

  return null;
}

function toHeadingLevel(value: string | undefined) {
  const token = value?.trim();

  if (token === "1" || token === "一") {
    return 1;
  }
  if (token === "2" || token === "二") {
    return 2;
  }
  if (token === "3" || token === "三") {
    return 3;
  }
  if (token === "4" || token === "四") {
    return 4;
  }
  if (token === "5" || token === "五") {
    return 5;
  }
  if (token === "6" || token === "六") {
    return 6;
  }

  return null;
}
