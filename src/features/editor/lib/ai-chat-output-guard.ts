import type {
  AiChatDocumentAction,
  AiChatMessage,
  AiChatResponseMode,
} from "@/features/app-state/types";
import {
  containsAiEditPayloadFragment,
  looksLikeStandaloneAiEditPayloadJson,
  stripTrailingAiEditPayloadFragment,
} from "@/features/editor/lib/ai-chat-edit-payload-fragments";
import { hasSupportedAiDocumentEditOperationTypes } from "@/features/editor/lib/ai-chat-document-edit-operation-normalization";
import { preferExplicitReplacementCandidate } from "@/features/editor/lib/ai-chat-replacement-content";

export type InvalidEditBlocksFallback = {
  blockId?: string;
  kind: "delete_block" | "insert_after_block" | "replace_block";
  summary: string;
};

const pseudoToolCallPattern =
  /<\s*(?:\||\uFF5C){2}\s*DSML\s*(?:\||\uFF5C){2}\s*tool_calls\b/i;

export function containsPseudoToolCallText(text: string) {
  return pseudoToolCallPattern.test(text);
}

export function getPseudoToolCallFallbackText(documentAction: AiChatDocumentAction | null) {
  if (documentAction === "edit_blocks") {
    return JSON.stringify({
      summary: "模型返回了内部工具调用格式，未修改文档。",
      operations: [],
    });
  }

  return "模型返回了内部工具调用格式，未能完成请求。";
}

export function sanitizeAiAssistantText(
  text: string,
  documentAction: AiChatDocumentAction | null = null,
  responseMode: AiChatResponseMode | null = null,
  invalidEditBlocksFallback?: InvalidEditBlocksFallback | null,
) {
  if (containsPseudoToolCallText(text)) {
    return getPseudoToolCallFallbackText(documentAction);
  }

  if (documentAction === "edit_blocks" && !isValidEditBlocksPayload(text)) {
    const insertableContent = sanitizeAiInsertedContent(
      stripLeadingAssistantPreamble(text, "insert_end", responseMode),
    );
    const replaceableContent = preferExplicitReplacementCandidate(
      stripTrailingAiEditPayloadFragment(stripReplaceBlockPreamble(text, responseMode)),
    );

    if (invalidEditBlocksFallback?.kind === "delete_block" && invalidEditBlocksFallback.blockId) {
      return JSON.stringify({
        summary: invalidEditBlocksFallback.summary,
        operations: [
          {
            blockId: invalidEditBlocksFallback.blockId,
            type: "delete_block",
          },
        ],
      });
    }

    if (
      invalidEditBlocksFallback?.kind === "insert_after_block" &&
      invalidEditBlocksFallback.blockId &&
      looksLikeInsertableContent(insertableContent)
    ) {
      return JSON.stringify({
        summary: invalidEditBlocksFallback.summary,
        operations: [
          {
            blockId: invalidEditBlocksFallback.blockId,
            content: insertableContent,
            type: "insert_after_block",
          },
        ],
      });
    }

    if (
      invalidEditBlocksFallback?.kind === "replace_block" &&
      invalidEditBlocksFallback.blockId &&
      looksLikeReplaceableBlockContent(replaceableContent)
    ) {
      return JSON.stringify({
        summary: invalidEditBlocksFallback.summary,
        operations: [
          {
            blockId: invalidEditBlocksFallback.blockId,
            content: replaceableContent,
            type: "replace_block",
          },
        ],
      });
    }

    return JSON.stringify({
      summary: getInvalidEditBlocksSummary(text),
      operations: [],
    });
  }

  if (documentAction === "edit_blocks") {
    return text;
  }

  return normalizeStructuredTransformContent(
    stripTrailingNonActionBoilerplate(
      stripLeadingAssistantPreamble(text, documentAction, responseMode),
      documentAction,
    ),
    responseMode,
  );
}

export function sanitizeAiInsertedContent(text: string) {
  return stripTrailingAiEditPayloadFragment(
    stripLeadingAssistantPreamble(text, "insert_end", null),
  );
}

export function sanitizeAiChatMessage(
  message: AiChatMessage,
  documentAction: AiChatDocumentAction | null = null,
  responseMode: AiChatResponseMode | null = null,
): AiChatMessage {
  if (message.role !== "assistant") {
    return message;
  }

  const text = message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");

  if (!containsPseudoToolCallText(text)) {
    return message;
  }

  return {
    ...message,
    parts: [
      {
        text: getPseudoToolCallFallbackText(documentAction),
        type: "text" as const,
      },
    ],
    metadata: {
      ...message.metadata,
      createdAt: message.metadata?.createdAt ?? new Date().toISOString(),
      responseMode,
    },
  };
}

function isValidEditBlocksPayload(text: string) {
  try {
    const parsed = JSON.parse(text.trim()) as {
      operations?: unknown;
      summary?: unknown;
    };

    return (
      typeof parsed.summary === "string" &&
      Array.isArray(parsed.operations) &&
      hasSupportedAiDocumentEditOperationTypes(parsed.operations)
    );
  } catch {
    return false;
  }
}

function getInvalidEditBlocksSummary(text: string) {
  if (/无法|不能|失败|403|502|not found|fetch failed/i.test(text)) {
    return "无法获取可靠的实时网页数据，未修改文档。";
  }

  return "模型没有返回可应用的文档操作，未修改文档。";
}

function stripLeadingAssistantPreamble(
  text: string,
  documentAction: AiChatDocumentAction | null,
  responseMode: AiChatResponseMode | null,
) {
  let remaining = text.trim();

  if (
    documentAction === "insert_end" ||
    documentAction === "insert_cursor" ||
    documentAction === "replace_selection"
  ) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const next = stripOneLeadingDocumentActionPreambleBlock(remaining, documentAction);

      if (next === remaining) {
        break;
      }

      remaining = next;
    }
  }

  if (responseMode) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const next = stripOneLeadingTransformPreambleBlock(remaining, responseMode);

      if (next === remaining) {
        break;
      }

      remaining = next;
    }
  }

  return stripSingleLeadingPreambleLine(remaining, documentAction, responseMode);
}

function stripTrailingNonActionBoilerplate(
  text: string,
  documentAction: AiChatDocumentAction | null,
) {
  if (documentAction) {
    return text.trim();
  }

  return text
    .replace(/\n{2,}由于当前对话(?:回合)?未标记为自动文档操作[\s\S]*$/u, "")
    .replace(/\n{2,}This turn is not marked as an automatic document action[\s\S]*$/iu, "")
    .trim();
}

function stripOneLeadingDocumentActionPreambleBlock(
  text: string,
  documentAction: "insert_end" | "insert_cursor" | "replace_selection",
) {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  const separatorMatch = normalized.match(/\n\s*\n/);

  if (!separatorMatch || separatorMatch.index == null) {
    return normalized;
  }

  const firstBlock = normalized.slice(0, separatorMatch.index).trim();
  const rest = normalized.slice(separatorMatch.index + separatorMatch[0].length).trim();

  if (!firstBlock || !rest) {
    return normalized;
  }

  return isDisposableDocumentActionPreamble(firstBlock, documentAction) ? rest : normalized;
}

function stripOneLeadingTransformPreambleBlock(
  text: string,
  responseMode: AiChatResponseMode,
) {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  const separatorMatches = [
    normalized.match(/\n\s*\n/),
    normalized.match(/\n/),
  ].filter((match): match is RegExpMatchArray & { index: number } => match?.index != null);

  for (const separatorMatch of separatorMatches) {
    const firstBlock = normalized.slice(0, separatorMatch.index).trim();
    const rest = normalized.slice(separatorMatch.index + separatorMatch[0].length).trim();

    if (!firstBlock || !rest) {
      continue;
    }

    if (
      isDisposableTransformPreamble(firstBlock, responseMode) &&
      looksLikeStructuredTransformContent(rest, responseMode)
    ) {
      return rest;
    }
  }

  return normalized;
}

function stripSingleLeadingPreambleLine(
  text: string,
  documentAction: AiChatDocumentAction | null,
  responseMode: AiChatResponseMode | null,
) {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  const lines = normalized.split("\n");

  if (lines.length < 2) {
    return normalized;
  }

  const firstLine = lines[0]?.trim() ?? "";
  const rest = lines.slice(1).join("\n").trim();

  if (!firstLine || !rest) {
    return normalized;
  }

  if (
    documentAction &&
    documentAction !== "edit_blocks" &&
    isDisposableDocumentActionPreamble(firstLine, documentAction) &&
    looksLikeInsertableContent(rest)
  ) {
    return rest;
  }

  if (
    responseMode &&
    isDisposableTransformPreamble(firstLine, responseMode) &&
    looksLikeStructuredTransformContent(rest, responseMode)
  ) {
    return rest;
  }

  return normalized;
}

function stripReplaceBlockPreamble(
  text: string,
  responseMode: AiChatResponseMode | null,
) {
  const strippedSelectionStyle = stripLeadingAssistantPreamble(
    text,
    "replace_selection",
    responseMode,
  );
  const normalized = strippedSelectionStyle.replace(/\r\n?/g, "\n").trim();
  const separatorMatches = [
    normalized.match(/\n\s*\n/),
    normalized.match(/\n/),
  ].filter((match): match is RegExpMatchArray & { index: number } => match?.index != null);

  for (const separatorMatch of separatorMatches) {
    const firstBlock = normalized.slice(0, separatorMatch.index).trim();
    const rest = normalized.slice(separatorMatch.index + separatorMatch[0].length).trim();

    if (!firstBlock || !rest) {
      continue;
    }

    if (isDisposableRewritePreamble(firstBlock)) {
      return rest;
    }
  }

  return normalized;
}

function isDisposableDocumentActionPreamble(
  block: string,
  documentAction: "insert_end" | "insert_cursor" | "replace_selection",
) {
  const compact = block.replace(/\s+/g, " ").trim();

  const genericIntroPattern =
    /^(?:好的?[，, ]*|当然[，, ]*|可以[，, ]*|没问题[，, ]*|行[，, ]*|下面|以下|如下|这是|这里是|Here(?:'s| is)|Below(?: is| are)|As requested[, ]*|Sure[, ]*|Okay[, ]*|Ok[, ]*).*(?:如下|以下|下面|as follows|below|following|列表|清单|内容|结果|文本)?[：:。.!！]?$/iu;

  if (documentAction === "replace_selection") {
    return (
      /^(?:好的?[，, ]*|当然[，, ]*|可以[，, ]*|没问题[，, ]*|行[，, ]*|我已|我已经|已|已经|现已|Here(?:'s| is)|Below(?: is| are)|I(?: have|'ve)|I(?: will|'ll)|Sure[, ]*|Okay[, ]*).{0,120}(?:替换|改写|重写|润色|翻译|修改|replace|rewrite|revise|polish|translate|update).{0,120}(?:选区|选中文本|所选|selection|selected text|below|following|如下|以下).*[：:。.!！]?$/iu.test(
        compact,
      ) || genericIntroPattern.test(compact)
    );
  }

  return (
    /^(?:好的?[，, ]*|当然[，, ]*|可以[，, ]*|没问题[，, ]*|行[，, ]*|我已|我已经|已|已经|现已|Here(?:'s| is)|Below(?: is| are)|I(?: have|'ve)|I(?: will|'ll)|Sure[, ]*|Okay[, ]*).{0,120}(?:插入|加入|添加|放到|放入|写入|insert|add|append|place|put).{0,120}(?:文档|末尾|末端|光标|当前位置|此处|document|doc|end|bottom|cursor|here|below|following|如下|以下).*[：:。.!！]?$/iu.test(
      compact,
    ) || genericIntroPattern.test(compact)
  );
}

function isDisposableTransformPreamble(
  block: string,
  responseMode: AiChatResponseMode,
) {
  const compact = block.replace(/\s+/g, " ").trim();
  const modeToken =
    responseMode === "table"
      ? "(?:表格|表|table)"
      : responseMode === "key_points"
        ? "(?:要点|重点|关键点|关键要点|key points?|bullet points?|highlights?)"
        : "(?:列表|清单|条目|list|bullet list|bullets?)";

  return new RegExp(
    String.raw`^(?:好的?[，, ]*|当然[，, ]*|可以[，, ]*|没问题[，, ]*|行[，, ]*|下面|以下|如下|这是|这里是|Here(?:'s| is)|Below(?: is| are)|As requested[, ]*|Sure[, ]*|Okay[, ]*|Ok[, ]*).{0,140}(?:(?:整理|改成|改为|转成|转换成|做成|写成|变成|提炼|总结|概括|归纳|format|rewrite|convert|turn).{0,60})?${modeToken}.{0,80}[：:。.!！]?$`,
    "iu",
  ).test(compact);
}

function isDisposableRewritePreamble(block: string) {
  const compact = block.replace(/\s+/g, " ").trim();

  return /^(?:好的?[，, ]*|当然[，, ]*|可以[，, ]*|没问题[，, ]*|行[，, ]*|下面|以下|如下|这是|这里是|Here(?:'s| is)|Below(?: is| are)|As requested[, ]*|Sure[, ]*|Okay[, ]*|Ok[, ]*).{0,140}(?:加长|扩写|改写|重写|润色|优化|完善|补充|expanded|longer|rewritten|revised|polished|improved).{0,80}(?:总结|摘要|概述|summary).*[：:。.!！]?$/iu.test(
    compact,
  );
}

function looksLikeStructuredTransformContent(
  text: string,
  responseMode: AiChatResponseMode,
) {
  const trimmed = text.trim();
  const nonEmptyLines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!nonEmptyLines.length) {
    return false;
  }

  if (responseMode === "table") {
    return (
      /^\|.+\|(?:\n\|[-:| ]+\|)?/m.test(trimmed) ||
      /<table(?:\s|>)/i.test(trimmed)
    );
  }

  return (
    /^(?:[-*+]\s+|\d+\.\s+|#{1,6}\s+)/m.test(trimmed) ||
    nonEmptyLines.length >= 3
  );
}

function looksLikeInsertableContent(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return false;
  }

  if (
    looksLikeStandaloneAiEditPayloadJson(trimmed) ||
    containsAiEditPayloadFragment(trimmed)
  ) {
    return false;
  }

  return (
    /^(?:[-*+]\s+|\d+\.\s+|#{1,6}\s+|>|```|``|\|.+\|)/m.test(trimmed) ||
    /^[^\n]{1,160}$/.test(trimmed) ||
    trimmed.split("\n").filter((line) => line.trim()).length >= 2
  );
}

function looksLikeReplaceableBlockContent(text: string) {
  const trimmed = text.trim();
  const nonEmptyLines = trimmed.split("\n").filter((line) => line.trim());
  const headingCount = nonEmptyLines.filter((line) => /^#{1,6}\s+/.test(line)).length;

  if (!looksLikeInsertableContent(trimmed)) {
    return false;
  }

  if (headingCount > 1) {
    return false;
  }

  if (trimmed.length > 1600 && nonEmptyLines.length > 8) {
    return false;
  }

  return true;
}

function normalizeStructuredTransformContent(
  text: string,
  responseMode: AiChatResponseMode | null,
) {
  if (responseMode !== "list" && responseMode !== "key_points") {
    return text;
  }

  const normalized = text.replace(/\r\n?/g, "\n").trim();

  if (!normalized || /^(?:[-*+]\s+|\d+\.\s+)/m.test(normalized)) {
    return normalized;
  }

  if (/^\|.+\|(?:\n\|[-:| ]+\|)?/m.test(normalized) || /<table(?:\s|>)/i.test(normalized)) {
    return normalized;
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return normalized;
  }

  return lines
    .map((line) => {
      if (/^#{1,6}\s+/.test(line)) {
        return `- ${line.replace(/^#{1,6}\s+/, "").trim()}`;
      }

      if (/^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
        return line;
      }

      return `- ${line}`;
    })
    .join("\n");
}
