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
