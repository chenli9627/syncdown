import type { AiChatDocumentBlock } from "@/features/app-state/types";
import type {
  AiDocumentEditPayload,
  ListTypeName,
} from "@/features/editor/lib/ai-chat-document-edit-types";
import {
  cleanTarget,
  cleanValue,
  findSingleBlockContaining,
} from "@/features/editor/lib/ai-chat-deterministic-document-edit-utils";

const LIST_BLOCK_TYPES = ["bulletList", "orderedList", "taskList"] as const;

export function buildListTransformPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const chineseMatch = prompt.match(
    /(?:把|将)\s*(?:包含|含有)\s*[“"'`]?([^“”"'`\n]{1,96})[”"'`]?\s*(?:的)?(段落|列表|任务列表|待办列表|无序列表|有序列表)?\s*(?:改成|改为|转成|转换成|整理成|变成)\s*(段落|列表|任务列表|待办列表|无序列表|有序列表)/u,
  );
  const englishMatch = prompt.match(
    /\b(?:change|convert|turn)\s+(?:the\s+)?(?:(paragraph|list|task list|bullet list|ordered list)\s+)?(?:containing|with)\s+["'`]?([^"'`\n]{1,96})["'`]?\s+(?:to|into)\s+(paragraph|list|task list|bullet list|ordered list)/i,
  );
  const target = cleanTarget(chineseMatch?.[1] ?? englishMatch?.[2]);
  const sourceKind = cleanTarget(chineseMatch?.[2] ?? englishMatch?.[1]);
  const targetKind = cleanTarget(chineseMatch?.[3] ?? englishMatch?.[3]);

  if (!target || !targetKind) {
    return null;
  }

  const block = findSingleBlockContaining(
    documentBlocks,
    target,
    resolveSourceBlockTypes(sourceKind),
  );

  if (!block) {
    return null;
  }

  const targetListType = resolveTargetListType(targetKind);

  if (targetListType) {
    return {
      operations: [{ blockId: block.id, listType: targetListType, type: "set_list_type" }],
      summary: `已将包含“${target}”的${describeBlock(block.type)}改成${describeListType(targetListType)}。`,
    };
  }

  if (isParagraphTarget(targetKind)) {
    const paragraphContent = toParagraphContent(block);

    return paragraphContent
      ? {
          operations: [{ blockId: block.id, content: paragraphContent, type: "replace_block" }],
          summary: `已将包含“${target}”的${describeBlock(block.type)}改成段落。`,
        }
      : null;
  }

  return null;
}

function resolveSourceBlockTypes(sourceKind: string) {
  if (!sourceKind) {
    return ["paragraph", ...LIST_BLOCK_TYPES];
  }

  if (/(?:段落|paragraph)/i.test(sourceKind)) {
    return ["paragraph"];
  }

  if (/(?:任务列表|待办列表|task list)/i.test(sourceKind)) {
    return ["taskList"];
  }

  if (/(?:无序列表|bullet list)/i.test(sourceKind)) {
    return ["bulletList"];
  }

  if (/(?:有序列表|ordered list)/i.test(sourceKind)) {
    return ["orderedList"];
  }

  if (/(?:列表|list)/i.test(sourceKind)) {
    return [...LIST_BLOCK_TYPES];
  }

  return undefined;
}

function resolveTargetListType(targetKind: string): ListTypeName | null {
  if (/(?:任务列表|待办列表|task list)/i.test(targetKind)) {
    return "taskList";
  }

  if (/(?:无序列表|列表|bullet list|list)/i.test(targetKind) && !/(?:有序|任务)/i.test(targetKind)) {
    return "bulletList";
  }

  if (/(?:有序列表|ordered list)/i.test(targetKind)) {
    return "orderedList";
  }

  return null;
}

function isParagraphTarget(targetKind: string) {
  return /(?:段落|paragraph)/i.test(targetKind);
}

function toParagraphContent(block: AiChatDocumentBlock) {
  if (block.type === "paragraph") {
    return cleanValue(block.text);
  }

  const itemTexts = getListItemTexts(block);

  if (!itemTexts.length) {
    return cleanValue(block.text);
  }

  return itemTexts.join("；");
}

function getListItemTexts(block: AiChatDocumentBlock) {
  const markdown = block.markdown?.trim() ?? "";

  if (markdown) {
    const items = markdown
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^- \[(?: |x)\]\s+/i, ""))
      .map((line) => line.replace(/^[-*+]\s+/, ""))
      .map((line) => line.replace(/^\d+\.\s+/, ""))
      .map((line) => cleanValue(line))
      .filter(Boolean);

    if (items.length) {
      return items;
    }
  }

  const html = block.html ?? "";

  if (html.includes("<li")) {
    const matches = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((match) =>
      cleanValue(match[1]?.replace(/<[^>]+>/g, " ") ?? ""),
    );

    if (matches.length) {
      return matches;
    }
  }

  return cleanValue(block.text) ? [cleanValue(block.text)] : [];
}

function describeBlock(blockType: string) {
  if (blockType === "paragraph") {
    return "段落";
  }

  if (blockType === "taskList") {
    return "任务列表";
  }

  if (blockType === "orderedList") {
    return "有序列表";
  }

  return "列表";
}

function describeListType(listType: ListTypeName) {
  if (listType === "taskList") {
    return "任务列表";
  }

  if (listType === "orderedList") {
    return "有序列表";
  }

  return "无序列表";
}
