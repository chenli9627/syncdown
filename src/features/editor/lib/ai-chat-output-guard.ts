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

  return text;
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
