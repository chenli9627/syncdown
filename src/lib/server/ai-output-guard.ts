import type { TextStreamPart, ToolSet } from "ai";
import type {
  AiChatDocumentAction,
  AiChatDocumentBlock,
  AiChatResponseMode,
} from "@/features/app-state/types";
import {
  containsPseudoToolCallText,
  sanitizeAiAssistantText,
} from "@/features/editor/lib/ai-chat-output-guard";

export function guardPseudoToolCallText<TOOLS extends ToolSet>(
  documentAction: AiChatDocumentAction | null,
  responseMode: AiChatResponseMode | null,
  invalidEditBlocksFallback?: {
    blockId: string;
    summary: string;
  } | null,
) {
  return () => {
    let blocked = false;
    let fallbackEmitted = false;
    let textBuffer = "";
    let textId: string | null = null;

    function flushText(controller: TransformStreamDefaultController<TextStreamPart<TOOLS>>) {
      if (blocked) {
        if (!fallbackEmitted && textId) {
          controller.enqueue({
            id: textId,
            text: sanitizeAiAssistantText(
              textBuffer,
              documentAction,
              responseMode,
              invalidEditBlocksFallback,
            ),
            type: "text-delta",
          });
          fallbackEmitted = true;
        }
        textBuffer = "";
        return;
      }

      if (textBuffer && textId) {
        controller.enqueue({
          id: textId,
          text: sanitizeAiAssistantText(
            textBuffer,
            documentAction,
            responseMode,
            invalidEditBlocksFallback,
          ),
          type: "text-delta",
        });
        textBuffer = "";
      }
    }

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      flush(controller) {
        flushText(controller);
      },
      transform(chunk, controller) {
        if (chunk.type === "text-start") {
          textId = chunk.id;
          controller.enqueue(chunk);
          return;
        }

        if (chunk.type === "text-delta") {
          textId = chunk.id;
          textBuffer += chunk.text;

          if (containsPseudoToolCallText(textBuffer)) {
            blocked = true;
          }
          return;
        }

        if (chunk.type === "text-end") {
          flushText(controller);
          controller.enqueue(chunk);
          return;
        }

        controller.enqueue(chunk);
      },
    });
  };
}

export function getInvalidEditBlocksFallback({
  documentAction,
  documentBlocks,
  prompt,
}: {
  documentAction: AiChatDocumentAction | null;
  documentBlocks: AiChatDocumentBlock[];
  prompt: string;
}) {
  if (documentAction !== "edit_blocks") {
    return null;
  }

  const summaryReplacementBlockId = findSummaryReplacementBlockId(prompt, documentBlocks);

  if (summaryReplacementBlockId) {
    return {
      blockId: summaryReplacementBlockId,
      kind: "replace_block" as const,
      summary: "已更新当前总结。",
    };
  }

  if (isDeleteTablePrompt(prompt)) {
    const tableBlock = [...documentBlocks]
      .reverse()
      .find((candidate) => candidate.type === "table");

    if (tableBlock) {
      return {
        blockId: tableBlock.id,
        kind: "delete_block" as const,
        summary: "删除了文档中的表格。",
      };
    }
  }

  if (!isInsertionPrompt(prompt)) {
    return null;
  }

  const block = [...documentBlocks]
    .reverse()
    .find((candidate) => candidate.text.trim() || candidate.type !== "paragraph");

  if (!block) {
    return null;
  }

  return {
    blockId: block.id,
    kind: "insert_after_block" as const,
    summary: "在文档中插入了模型生成的内容。",
  };
}

function findSummaryReplacementBlockId(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
) {
  if (!isSummaryReplacementPrompt(prompt)) {
    return null;
  }

  const summaryHeadingIndex = documentBlocks.findIndex(
    (block) => block.type === "heading" && isSummaryHeadingText(block.text),
  );

  if (summaryHeadingIndex >= 0) {
    for (let index = summaryHeadingIndex + 1; index < documentBlocks.length; index += 1) {
      const block = documentBlocks[index];

      if (!block) {
        break;
      }

      if (block.type === "heading") {
        break;
      }

      if (block.text.trim()) {
        return block.id;
      }
    }
  }

  const summaryBlocks = documentBlocks.filter(
    (block) => block.type !== "heading" && isSummaryContentText(block.text),
  );

  if (summaryBlocks.length === 1) {
    return summaryBlocks[0]?.id ?? null;
  }

  return summaryBlocks[summaryBlocks.length - 1]?.id ?? null;
}

function isSummaryReplacementPrompt(prompt: string) {
  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");
  const lowerPrompt = prompt.toLowerCase();

  if (!/(?:总结|摘要|概述|summary)/i.test(prompt)) {
    return false;
  }

  return (
    /(?:总结|摘要|概述).{0,32}(?:加长|扩写|改写|重写|润色|优化|详细|完善|补充|展开|丰富).{0,32}(?:替换|覆盖|改掉|更新|替换掉|替换现在的|替换当前的)?/.test(
      compactPrompt,
    ) ||
    /(?:加长|扩写|改写|重写|润色|优化|详细|完善|补充|展开|丰富).{0,32}(?:总结|摘要|概述).{0,32}(?:替换|覆盖|改掉|更新|替换掉|替换现在的|替换当前的)?/.test(
      compactPrompt,
    ) ||
    /(?:替换|覆盖|改掉|更新).{0,32}(?:当前|现在|现有|已有|原有|原来).{0,16}(?:总结|摘要|概述)/.test(
      compactPrompt,
    ) ||
    /\b(?:expand|lengthen|rewrite|revise|polish|improve|update)\b[\s\S]{0,80}\b(?:current|existing)\b[\s\S]{0,40}\bsummary\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:current|existing)\b[\s\S]{0,40}\bsummary\b[\s\S]{0,80}\b(?:expand|lengthen|rewrite|revise|polish|improve|update|replace)\b/.test(
      lowerPrompt,
    )
  );
}

function isSummaryHeadingText(text: string) {
  return /^(?:总结|摘要|概述|summary)$/iu.test(text.trim());
}

function isSummaryContentText(text: string) {
  return /^(?:总结|摘要|概述|summary)\s*[:：]/iu.test(text.trim());
}

function isDeleteTablePrompt(prompt: string) {
  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");

  return (
    /(?:删除|删掉|移除|去掉).{0,12}(?:这个|该|此|上面|刚才|当前|最后)?.{0,12}(?:图表|表格|table|chart)/i.test(
      compactPrompt,
    ) ||
    /(?:this|the|last|current|previous).{0,20}(?:table|chart).{0,20}(?:delete|remove)/i.test(
      prompt,
    ) ||
    /(?:delete|remove).{0,20}(?:this|the|last|current|previous).{0,20}(?:table|chart)/i.test(
      prompt,
    )
  );
}

function isInsertionPrompt(prompt: string) {
  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");
  const lowerPrompt = prompt.toLowerCase();

  return (
    /(?:放到|放入|放进|放在|写入|插入到|插入进|添加到|添加在|加入到|加到|追加到).{0,24}(?:文档|正文|页面|末尾|最后|结尾|底部|这里|此处|当前位置|光标)/.test(
      compactPrompt,
    ) ||
    /(?:文档|正文|页面|末尾|最后|结尾|底部|这里|此处|当前位置|光标).{0,24}(?:放|写入|插入|添加|加入|加|追加)/.test(
      compactPrompt,
    ) ||
    /\b(?:append|insert|add|place|put|write)\b[\s\S]{0,120}\b(?:document|doc|page|end|bottom|here|cursor)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:document|doc|page|end|bottom|here|cursor)\b[\s\S]{0,120}\b(?:append|insert|add|place|put|write)\b/.test(
      lowerPrompt,
    )
  );
}
