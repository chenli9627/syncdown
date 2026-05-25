import type { AiChatDocumentBlock } from "@/features/app-state/types";
import type { AiDocumentEditPayload } from "@/features/editor/lib/ai-chat-document-edit-types";
import { buildCountedLastBlockDeletePayload } from "@/features/editor/lib/ai-chat-deterministic-document-edit-delete-counted";
import {
  findLastBlockOfTypes,
  getSectionBlockIds,
} from "@/features/editor/lib/ai-chat-deterministic-document-edit-delete-helpers";
import {
  cleanTarget,
  findSingleBlockContaining,
} from "@/features/editor/lib/ai-chat-deterministic-document-edit-utils";

export function buildDocumentDeletePayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  return (
    buildMultiSectionDeletePayload(prompt, documentBlocks) ??
    buildSectionDeletePayload(prompt, documentBlocks) ??
    buildCountedLastBlockDeletePayload(prompt, documentBlocks) ??
    buildLastBlockDeletePayload(prompt, documentBlocks) ??
    buildContainingBlockDeletePayload(prompt, documentBlocks)
  );
}

function buildMultiSectionDeletePayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  if (
    !/(?:删除|移除|删掉|去掉)/u.test(prompt) ||
    !/(?:标题|小节|章节|部分).{0,16}(?:下面的内容|其下面的内容|内容)/u.test(prompt)
  ) {
    return null;
  }

  const targets = [...prompt.matchAll(/[“"'`]([^“”"'`\n]{1,96})[”"'`]/g)]
    .map((match) => cleanTarget(match[1]))
    .filter(Boolean);

  if (targets.length < 2) {
    return null;
  }

  const headingBlocks = targets
    .map((target) => findSingleBlockContaining(documentBlocks, target, ["heading"]))
    .filter((block): block is NonNullable<typeof block> => Boolean(block));

  if (headingBlocks.length !== targets.length) {
    return null;
  }

  const blockIds = [...new Set(headingBlocks.flatMap((block) => getSectionBlockIds(documentBlocks, block.id)))];

  if (!blockIds.length) {
    return null;
  }

  return {
    operations: blockIds.map((blockId) => ({ blockId, type: "delete_block" as const })),
    summary: `已删除${headingBlocks.map((block) => `“${block.text}”`).join("和")}及其下面的内容。`,
  };
}

function buildSectionDeletePayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const chineseMatch = prompt.match(
    /(?:删除|移除|删掉|去掉)\s*[“"'`]?([^“”"'`\n]{1,96})[”"'`]?\s*(?:这一节|这节|章节|小节|部分)/u,
  );
  const englishMatch = prompt.match(
    /\b(?:delete|remove)\s+(?:the\s+)?(?:section|subsection|part)\s+["'`]?([^"'`\n]{1,96})["'`]?/i,
  );
  const target = cleanTarget(chineseMatch?.[1] ?? englishMatch?.[1]);

  if (!target) {
    return null;
  }

  const headingBlock = findSingleBlockContaining(documentBlocks, target, ["heading"]);

  if (!headingBlock) {
    return null;
  }

  const sectionBlockIds = getSectionBlockIds(documentBlocks, headingBlock.id);

  if (!sectionBlockIds.length) {
    return null;
  }

  return {
    operations: sectionBlockIds.map((blockId) => ({ blockId, type: "delete_block" as const })),
    summary: `已删除“${headingBlock.text}”这一节。`,
  };
}

function buildLastBlockDeletePayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");

  if (/(?:删除|移除|删掉|去掉)(?:最后|末尾)(?:一段|段落)/.test(compactPrompt)) {
    const block = findLastBlockOfTypes(documentBlocks, ["paragraph"]);
    return block
      ? {
          operations: [{ blockId: block.id, type: "delete_block" }],
          summary: "已删除最后一段。",
        }
      : null;
  }

  if (/(?:删除|移除|删掉|去掉)(?:最后|末尾)(?:一个)?表格/.test(compactPrompt)) {
    const block = findLastBlockOfTypes(documentBlocks, ["table"]);
    return block
      ? {
          operations: [{ blockId: block.id, type: "delete_block" }],
          summary: "已删除最后一个表格。",
        }
      : null;
  }

  if (/(?:删除|移除|删掉|去掉)(?:最后|末尾)(?:一个)?列表/.test(compactPrompt)) {
    const block = findLastBlockOfTypes(documentBlocks, ["bulletList", "orderedList", "taskList"]);
    return block
      ? {
          operations: [{ blockId: block.id, type: "delete_block" }],
          summary: "已删除最后一个列表。",
        }
      : null;
  }

  if (/(?:删除|移除|删掉|去掉)(?:最后|末尾)(?:一节|章节|小节|部分)/.test(compactPrompt)) {
    const headingBlock = findLastBlockOfTypes(documentBlocks, ["heading"]);

    if (!headingBlock) {
      return null;
    }

    const sectionBlockIds = getSectionBlockIds(documentBlocks, headingBlock.id);

    return sectionBlockIds.length
      ? {
          operations: sectionBlockIds.map((blockId) => ({ blockId, type: "delete_block" as const })),
          summary: `已删除最后一节“${headingBlock.text}”。`,
        }
      : null;
  }

  return null;
}

function buildContainingBlockDeletePayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const chineseMatch = prompt.match(
    /(?:删除|移除|删掉|去掉)\s*(?:包含|含有)\s*[“"'`]?([^“”"'`\n]{1,96})[”"'`]?\s*(?:的)?(段落|标题|小节|列表|表格|块|引用|代码块)?/u,
  );
  const englishMatch = prompt.match(
    /\b(?:delete|remove)\s+(?:the\s+)?(?:(paragraph|heading|section|list|table|block|quote|code block)\s+)?(?:containing|with)\s+["'`]?([^"'`\n]{1,96})["'`]?/i,
  );
  const target = cleanTarget(chineseMatch?.[1] ?? englishMatch?.[2]);
  const kind = cleanTarget(chineseMatch?.[2] ?? englishMatch?.[1]);

  if (!target) {
    return null;
  }

  const block = findSingleBlockContaining(
    documentBlocks,
    target,
    resolveTargetBlockTypes(kind),
  );

  if (!block) {
    return null;
  }

  return {
    operations: [{ blockId: block.id, type: "delete_block" }],
    summary: `已删除包含“${target}”的${describeBlockKind(kind, block.type)}。`,
  };
}

function resolveTargetBlockTypes(kind: string) {
  if (!kind) {
    return undefined;
  }

  if (/(?:段落|paragraph|block)$/i.test(kind)) {
    return ["paragraph"];
  }

  if (/(?:标题|heading)$/i.test(kind)) {
    return ["heading"];
  }

  if (/(?:小节|section)$/i.test(kind)) {
    return ["heading"];
  }

  if (/(?:列表|list)$/i.test(kind)) {
    return ["bulletList", "orderedList", "taskList"];
  }

  if (/(?:表格|table)$/i.test(kind)) {
    return ["table"];
  }

  if (/(?:引用|quote)$/i.test(kind)) {
    return ["blockquote"];
  }

  if (/(?:代码块|codeblock|code block)$/i.test(kind)) {
    return ["codeBlock"];
  }

  return undefined;
}

function describeBlockKind(kind: string, fallbackType: string) {
  if (kind) {
    if (/(?:标题|heading)$/i.test(kind)) {
      return "标题";
    }
    if (/(?:小节|section)$/i.test(kind)) {
      return "小节";
    }
    if (/(?:列表|list)$/i.test(kind)) {
      return "列表";
    }
    if (/(?:表格|table)$/i.test(kind)) {
      return "表格";
    }
    if (/(?:引用|quote)$/i.test(kind)) {
      return "引用块";
    }
    if (/(?:代码块|codeblock|code block)$/i.test(kind)) {
      return "代码块";
    }
  }

  if (fallbackType === "heading") {
    return "标题";
  }

  if (fallbackType === "table") {
    return "表格";
  }

  if (fallbackType === "blockquote") {
    return "引用块";
  }

  if (fallbackType === "codeBlock") {
    return "代码块";
  }

  if (fallbackType === "bulletList" || fallbackType === "orderedList" || fallbackType === "taskList") {
    return "列表";
  }

  return "段落";
}
