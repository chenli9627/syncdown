import type { AiChatDocumentBlock } from "@/features/app-state/types";
import type {
  AiDocumentEditPayload,
} from "@/features/editor/lib/ai-chat-document-edit-types";
import { buildDocumentDeletePayload } from "@/features/editor/lib/ai-chat-deterministic-document-edit-delete";
import { buildHeadingLevelPayload } from "@/features/editor/lib/ai-chat-deterministic-document-edit-heading";
import { buildExplicitInsertPayload } from "@/features/editor/lib/ai-chat-deterministic-document-edit-insert";
import { buildListTransformPayload } from "@/features/editor/lib/ai-chat-deterministic-document-edit-list";
import { buildTableCellUpdatePayload } from "@/features/editor/lib/ai-chat-deterministic-document-edit-table";
import {
  cleanTarget,
  cleanValue,
  findBlocksContaining,
  findSingleBlockContaining,
  getFirstMatchGroup,
  resolveTextMarkInstruction,
} from "@/features/editor/lib/ai-chat-deterministic-document-edit-utils";

export function buildDeterministicAiDocumentEditPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  return (
    buildDocumentDeletePayload(prompt, documentBlocks) ??
    buildExplicitInsertPayload(prompt, documentBlocks) ??
    buildListTransformPayload(prompt, documentBlocks) ??
    buildContainingBlockReplacementPayload(prompt, documentBlocks) ??
    buildTableCellUpdatePayload(prompt, documentBlocks) ??
    buildTaskItemCheckedPayload(prompt, documentBlocks) ??
    buildHeadingLevelPayload(prompt, documentBlocks) ??
    buildTextMarkPayload(prompt, documentBlocks) ??
    buildLinkPayload(prompt, documentBlocks) ??
    buildExactTextReplacementPayload(prompt, documentBlocks)
  );
}

function buildContainingBlockReplacementPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const chineseMatch = prompt.match(
    /(?:把|将)\s*(?:包含|含有)\s*[“"'`]?([^“”"'`\n]{1,96})[”"'`]?\s*(?:的)?(段落|标题|小节|列表|表格|块|引用|代码块)?\s*(?:改成|改为|替换成|替换为|重写成)\s*([^\n]{1,240})/u,
  );
  const englishMatch = prompt.match(
    /\b(?:change|replace|rewrite|revise|update)\s+(?:the\s+)?(?:(paragraph|heading|section|list|table|block|quote|code block)\s+)?(?:containing|with)\s+["'`]?([^"'`\n]{1,96})["'`]?\s+(?:to|with)\s+["'`]?([^"'`\n]{1,240})["'`]?/i,
  );
  const target = cleanTarget(chineseMatch?.[1] ?? englishMatch?.[2]);
  const kind = cleanTarget(chineseMatch?.[2] ?? englishMatch?.[1]);
  const replacementContent = cleanValue(chineseMatch?.[3] ?? englishMatch?.[3]);
  if (!target || !replacementContent) {
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
    operations: [{ blockId: block.id, content: replacementContent, type: "replace_block" }],
    summary: `已改写包含“${target}”的${describeBlockKind(kind, block.type)}。`,
  };
}

function buildTaskItemCheckedPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const segments = prompt
    .split(/(?:[，,；;]|(?:并且|并|然后|且))/u)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const operations = segments
    .map((segment) => {
      const checked = !/(?:\u53d6\u6d88\u52fe\u9009|\u53d6\u6d88\u9009\u4e2d|\u53d6\u6d88\u5b8c\u6210|\buncheck\b)/i.test(
        segment,
      );
      const match =
        segment.match(
          /^(?:\u52fe\u9009|\u9009\u4e2d|\u5b8c\u6210|\u53d6\u6d88\u52fe\u9009|\u53d6\u6d88\u9009\u4e2d|\u53d6\u6d88\u5b8c\u6210)\s*(?:\u4efb\u52a1\u91cc\u7684|\u4efb\u52a1\u4e2d\u7684|\u5f85\u529e\u91cc\u7684|\u5f85\u529e\u4e2d\u7684)?([^\n,\uff0c\u3002\uff01\uff1f]{1,48})/u,
        ) ??
        segment.match(
          /(?:\u628a|\u5c06)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,48}?)\s*(?:\u8fd9\u4e2a)?(?:\u4efb\u52a1|\u5f85\u529e)?\s*(?:\u52fe\u9009|\u9009\u4e2d|\u5b8c\u6210|\u53d6\u6d88\u52fe\u9009|\u53d6\u6d88\u9009\u4e2d|\u53d6\u6d88\u5b8c\u6210)/u,
        );
      const target = cleanTarget(match?.[1]);
      if (!target) {
        return null;
      }

      const block = findSingleBlockContaining(documentBlocks, target, ["taskList"]);
      if (!block) {
        return null;
      }

      return {
        blockId: block.id,
        checked,
        targetText: target,
        type: "set_task_item_checked" as const,
      };
    })
    .filter((operation): operation is NonNullable<typeof operation> => Boolean(operation));

  if (!operations.length) {
    return null;
  }

  return {
    operations,
    summary: operations
      .map((operation) =>
        operation.checked
          ? `已勾选任务“${operation.targetText}”`
          : `已取消勾选任务“${operation.targetText}”`,
      )
      .join("；") + "。",
  };
}

function buildTextMarkPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const instruction = resolveTextMarkInstruction(prompt);
  const target = cleanTarget(getFirstMatchGroup(prompt, instruction?.patterns ?? []));
  if (!instruction || !target) {
    return null;
  }

  const matchingBlocks = findBlocksContaining(documentBlocks, target);
  if (!matchingBlocks.length || (matchingBlocks.length > 1 && !instruction.applyAll)) {
    return null;
  }

  return {
    operations: matchingBlocks.map((block) => ({
      blockId: block.id,
      marks: [instruction.mark],
      targetText: target,
      type: instruction.set ? "set_text_marks" : "unset_text_marks",
    })),
    summary: instruction.set
      ? `已将“${target}”设为${instruction.label}。`
      : `已移除“${target}”的${instruction.label}。`,
  };
}

function buildLinkPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const setMatch =
    prompt.match(
      /(?:\u628a|\u5c06)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,48}?)\s*\u7684(?:\u94fe\u63a5|\u94fe\u63a5\u5730\u5740)\s*(?:\u6539\u6210|\u6539\u4e3a|\u66f4\u65b0\u4e3a|\u8bbe\u4e3a|\u8bbe\u7f6e\u4e3a)\s*([^\s\u3002\uff01\uff1f,，]+)\s*/iu,
    ) ??
    prompt.match(
      /(?:\u7ed9|\u4e3a|\u628a|\u5c06)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,48}?)\s*(?:\u7684)?\s*(?:\u52a0\u4e0a|\u8bbe\u4e3a|\u8bbe\u7f6e\u4e3a|\u6539\u6210|\u6539\u4e3a|\u66f4\u65b0\u4e3a)?(?:\u94fe\u63a5|\u94fe\u63a5\u5730\u5740|\u94fe\u63a5 url)\s*([^\s\u3002\uff01\uff1f,，]+)\s*/iu,
    ) ??
    prompt.match(
      /(?:update|change|set)\s+(?:the\s+)?link(?:\s+url)?\s+(?:for\s+)?["'`]?([^"'`\n]{1,48})["'`]?\s+(?:to|as)\s+([^\s]+)\s*/i,
    );
  if (setMatch) {
    const target = cleanTarget(setMatch[1]);
    const href = cleanValue(setMatch[2]);
    const block = findSingleBlockContaining(documentBlocks, target);
    if (!target || !href || !block) {
      return null;
    }
    return {
      operations: [{ blockId: block.id, href, targetText: target, type: "set_link" }],
      summary: `已更新“${target}”的链接。`,
    };
  }

  const unsetMatch = prompt.match(
    /(?:\u5220\u9664|\u79fb\u9664|\u53bb\u6389|\u53d6\u6d88)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,48}?)\s*\u7684\u94fe\u63a5/iu,
  );
  const target = cleanTarget(unsetMatch?.[1]);
  const block = target ? findSingleBlockContaining(documentBlocks, target) : null;
  return target && block
    ? {
        operations: [{ blockId: block.id, targetText: target, type: "unset_link" }],
        summary: `已移除“${target}”的链接。`,
      }
    : null;
}

function buildExactTextReplacementPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const chineseMatch = prompt.match(
    /(?:\u628a|\u5c06)\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,48}?)\s*(?:\u6539\u6210|\u6539\u4e3a|\u66ff\u6362\u6210|\u66ff\u6362\u4e3a|\u66ff\u6362\u6389|\u66ff\u6362)\s*([^\n]{1,120})/u,
  );
  const englishMatch = prompt.match(
    /\b(?:replace|change|update|rename)\s+["'`]?([^"'`\n]{1,48})["'`]?\s+(?:with|to)\s+["'`]?([^"'`\n]{1,120})["'`]?/i,
  );
  const target = cleanTarget(chineseMatch?.[1] ?? englishMatch?.[1]);
  const replacementText = cleanValue(chineseMatch?.[2] ?? englishMatch?.[2]);
  if (!target || !replacementText || target === replacementText) {
    return null;
  }

  const matchingBlocks = findBlocksContaining(documentBlocks, target);
  if (!matchingBlocks.length) {
    return null;
  }

  if (/(?:\u6240\u6709|\u5168\u90e8|\u6bcf\u4e2a|\ball\b|\bevery\b)/i.test(prompt)) {
    return {
      operations: [
        {
          blockId: matchingBlocks[0]?.id ?? "block_1",
          replacementText,
          targetText: target,
          type: "replace_all_text",
        },
      ],
      summary: `已将所有“${target}”替换为“${replacementText}”。`,
    };
  }

  if (matchingBlocks.length !== 1) {
    return null;
  }

  return {
    operations: [
      {
        blockId: matchingBlocks[0].id,
        replacementText,
        targetText: target,
        type: "replace_text_in_block",
      },
    ],
    summary: `已将“${target}”改为“${replacementText}”。`,
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
