import type { AiChatDocumentBlock } from "@/features/app-state/types";
import type {
  AiDocumentEditPayload,
  HeadingLevel,
} from "@/features/editor/lib/ai-chat-document-edit-types";
import {
  cleanTarget,
  findSingleBlockContaining,
  toHeadingLevel,
} from "@/features/editor/lib/ai-chat-deterministic-document-edit-utils";

export function buildHeadingLevelPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  return (
    buildAllHeadingsToLevelPayload(prompt, documentBlocks) ??
    buildHeadingLevelShiftPayload(prompt, documentBlocks) ??
    buildTargetedHeadingLevelPayload(prompt, documentBlocks)
  );
}

function buildAllHeadingsToLevelPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");
  const chineseMatch = compactPrompt.match(
    /(?:把|将)?(?:文档中(?:的)?|全文(?:的)?|所有(?:的)?|全部(?:的)?)?(?:标题|heading)(?:都)?(?:改成|改为|设为|设置为|变成)(?:h)?([1-6一二三四五六])(?:级)?(?:标题)?/iu,
  );
  const englishMatch = prompt.match(
    /(?:change|set|turn)\s+(?:all\s+)?(?:document\s+)?headings?\s+(?:to|into)\s+h?([1-6])/i,
  );
  const level = toHeadingLevel(chineseMatch?.[1] ?? englishMatch?.[1]);
  const headingBlocks = documentBlocks.filter((block) => block.type === "heading");

  if (!level || !headingBlocks.length) {
    return null;
  }

  const operations = headingBlocks
    .map((block) =>
      block.level === level
        ? null
        : {
            blockId: block.id,
            level,
            type: "set_heading_level" as const,
          },
    )
    .filter((operation): operation is NonNullable<typeof operation> => Boolean(operation));

  return operations.length
    ? {
        operations,
        summary: `已将所有标题调整为 ${level} 级标题。`,
      }
    : {
        operations: [],
        summary: `未修改文档：所有标题已经是 ${level} 级标题。`,
      };
}

function buildHeadingLevelShiftPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");
  const lowerPrompt = prompt.toLowerCase();
  const headingBlocks = documentBlocks.filter((block) => block.type === "heading");
  if (!headingBlocks.length) {
    return null;
  }

  const direction = resolveHeadingShiftDirection(compactPrompt, lowerPrompt);
  if (!direction) {
    return null;
  }

  const operations = headingBlocks
    .map((block) => {
      const nextLevel = clampHeadingLevel((block.level ?? 1) + direction);
      if (nextLevel === block.level) {
        return null;
      }

      return {
        blockId: block.id,
        level: nextLevel,
        type: "set_heading_level" as const,
      };
    })
    .filter((operation): operation is NonNullable<typeof operation> => Boolean(operation));

  if (!operations.length) {
    return {
      operations: [],
      summary:
        direction > 0
          ? "未修改文档：没有可继续缩小的标题。"
          : "未修改文档：没有可继续放大的标题。",
    };
  }

  return {
    operations,
    summary:
      direction > 0
        ? "已将所有标题缩小一个等级。"
        : "已将所有标题放大一个等级。",
  };
}

function buildTargetedHeadingLevelPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const chineseMatch = prompt.match(
    /(?:把|将)\s*([^\n\uff0c\u3002\uff01\uff1f]{1,96}?)\s*(?:都)?(?:改成|改为|设为|设置为|变成)\s*(?:h\s*)?([1-6一二三四五六])(?:级)?标题/iu,
  );
  const englishMatch = prompt.match(
    /change\s+["'`]?([^"'`\n]{1,48})["'`]?\s+heading\s+level\s+to\s+h?([1-6])/i,
  );
  const target = cleanTarget(chineseMatch?.[1] ?? englishMatch?.[1]);
  const level = toHeadingLevel(chineseMatch?.[2] ?? englishMatch?.[2]);
  if (!target || !level) {
    return null;
  }

  const targets =
    chineseMatch != null
      ? target
          .split(/(?:和|以及|及|、)/u)
          .map((value) => cleanTarget(value))
          .filter(Boolean)
      : [target];
  const operations = targets
    .map((headingTarget) => {
      const block = findSingleBlockContaining(documentBlocks, headingTarget, ["heading"]);
      if (!block) {
        return null;
      }

      return {
        blockId: block.id,
        level,
        type: "set_heading_level" as const,
      };
    })
    .filter((operation): operation is NonNullable<typeof operation> => Boolean(operation));

  if (!operations.length) {
    return null;
  }

  return {
    operations,
    summary:
      operations.length === 1
        ? `已将“${targets[0]}”调整为 ${level} 级标题。`
        : `已将${targets.map((value) => `“${value}”`).join("、")}调整为 ${level} 级标题。`,
  };
}

function resolveHeadingShiftDirection(compactPrompt: string, lowerPrompt: string) {
  if (
    /(?:把|将)?(?:所有|全部)?标题(?:都)?(?:缩小|降级|降低|下调|往下调)(?:一个)?等级/.test(
      compactPrompt,
    ) ||
    /\b(?:demote|decrease|lower)\b[\s\S]{0,80}\b(?:all\s+)?headings?\b[\s\S]{0,40}\b(?:one\s+level|by\s+one)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:all\s+)?headings?\b[\s\S]{0,80}\b(?:demote|decrease|lower)\b[\s\S]{0,40}\b(?:one\s+level|by\s+one)\b/.test(
      lowerPrompt,
    )
  ) {
    return 1;
  }

  if (
    /(?:把|将)?(?:所有|全部)?标题(?:都)?(?:放大|升级|升高|提高|上调)(?:一个)?等级/.test(
      compactPrompt,
    ) ||
    /\b(?:promote|increase|raise)\b[\s\S]{0,80}\b(?:all\s+)?headings?\b[\s\S]{0,40}\b(?:one\s+level|by\s+one)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:all\s+)?headings?\b[\s\S]{0,80}\b(?:promote|increase|raise)\b[\s\S]{0,40}\b(?:one\s+level|by\s+one)\b/.test(
      lowerPrompt,
    )
  ) {
    return -1;
  }

  return null;
}

function clampHeadingLevel(level: number): HeadingLevel {
  return Math.min(6, Math.max(1, level)) as HeadingLevel;
}
