import type {
  AiChatDocumentAction,
  AiChatMessage,
} from "@/features/app-state/types";

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
) {
  if (containsPseudoToolCallText(text)) {
    return getPseudoToolCallFallbackText(documentAction);
  }

  if (documentAction === "edit_blocks" && !isValidEditBlocksPayload(text)) {
    return JSON.stringify({
      summary: getInvalidEditBlocksSummary(text),
      operations: [],
    });
  }

  return stripLeadingDocumentActionPreamble(text, documentAction);
}

export function sanitizeAiChatMessage(
  message: AiChatMessage,
  documentAction: AiChatDocumentAction | null = null,
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
        type: "text",
      },
    ],
  };
}

function isValidEditBlocksPayload(text: string) {
  try {
    const parsed = JSON.parse(text.trim()) as {
      operations?: unknown;
      summary?: unknown;
    };

    return typeof parsed.summary === "string" && Array.isArray(parsed.operations);
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

function stripLeadingDocumentActionPreamble(
  text: string,
  documentAction: AiChatDocumentAction | null,
) {
  if (
    documentAction !== "insert_end" &&
    documentAction !== "insert_cursor" &&
    documentAction !== "replace_selection"
  ) {
    return text;
  }

  let remaining = text.trim();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const next = stripOneLeadingPreambleBlock(remaining, documentAction);

    if (next === remaining) {
      break;
    }

    remaining = next;
  }

  return remaining;
}

function stripOneLeadingPreambleBlock(
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
