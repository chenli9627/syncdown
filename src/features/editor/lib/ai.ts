import type { Locale } from "@/lib/i18n/messages";
import { escapeHtml, toEditorContent } from "@/features/editor/lib/content";

export type AiActionKind =
  | "improve_writing"
  | "explain"
  | "reformat"
  | "summarize"
  | "custom";

export type AiPreviewResult = {
  action: AiActionKind;
  text: string;
  viewOnly: boolean;
};

export type AiRequestPayload = {
  action: AiActionKind;
  locale: Locale;
  prompt?: string;
  selectedText: string;
};

export function generateAiPreview(
  action: AiActionKind,
  selectedText: string,
  locale: Locale,
  customPrompt?: string,
): AiPreviewResult {
  const cleanText = selectedText.trim();
  const prompt = customPrompt?.trim() ?? "";

  if (action === "improve_writing") {
    return {
      action,
      text: improveWriting(cleanText),
      viewOnly: false,
    };
  }

  if (action === "reformat") {
    return {
      action,
      text: reformatText(cleanText),
      viewOnly: false,
    };
  }

  if (action === "summarize") {
    return {
      action,
      text: summarizeText(cleanText, locale),
      viewOnly: true,
    };
  }

  if (action === "explain") {
    return {
      action,
      text: explainText(cleanText, locale),
      viewOnly: true,
    };
  }

  return {
    action,
    text: runCustomPrompt(cleanText, prompt, locale),
    viewOnly: false,
  };
}

export function getAiViewOnly(action: AiActionKind) {
  return action === "explain" || action === "summarize";
}

export function buildAiUserPrompt({
  action,
  locale,
  prompt,
  selectedText,
}: AiRequestPayload) {
  const cleanText = selectedText.trim();
  const customPrompt = prompt?.trim();

  const instruction =
    locale === "zh"
      ? getChineseInstruction(action, customPrompt)
      : getEnglishInstruction(action, customPrompt);

  return `${instruction}\n\n${locale === "zh" ? "待处理文本：" : "Selected text:"}\n${cleanText}`;
}

function getChineseInstruction(action: AiActionKind, customPrompt?: string) {
  if (action === "improve_writing") {
    return "请润色下面这段文字，保持原意，让表达更清晰自然。直接输出结果，不要加解释。";
  }

  if (action === "reformat") {
    return "请重组下面这段文字，让结构更清楚。直接输出结果，不要加解释。";
  }

  if (action === "summarize") {
    return "请总结下面这段文字。直接输出总结，不要加解释。";
  }

  if (action === "explain") {
    return "请解释下面这段文字在表达什么。直接输出解释，不要加额外前缀。";
  }

  return customPrompt?.trim() || "请按要求改写下面这段文字，直接输出结果，不要加解释。";
}

function getEnglishInstruction(action: AiActionKind, customPrompt?: string) {
  if (action === "improve_writing") {
    return "Improve the writing of the text below. Keep the meaning, make it clearer and more natural. Return only the rewritten result.";
  }

  if (action === "reformat") {
    return "Reformat the text below so the structure is clearer. Return only the result.";
  }

  if (action === "summarize") {
    return "Summarize the text below. Return only the summary.";
  }

  if (action === "explain") {
    return "Explain what the text below is saying. Return only the explanation.";
  }

  return customPrompt?.trim() || "Rewrite the text below according to the instruction. Return only the result.";
}

export function insertAiResultBelow(editorHtmlResult: string) {
  return `${toEditorContent(editorHtmlResult)}<p></p>`;
}

export function toAiInsertHtml(resultText: string) {
  return toEditorContent(resultText);
}

function improveWriting(input: string) {
  const normalized = input.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  const first = normalized.slice(0, 1).toUpperCase();
  const rest = normalized.slice(1);
  const sentence = `${first}${rest}`;

  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function reformatText(input: string) {
  const chunks = input
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (chunks.length <= 1) {
    return input
      .split(/[.!?]\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `• ${item}`)
      .join("\n");
  }

  return chunks.map((item) => `• ${item.replace(/^[-•]\s*/, "")}`).join("\n");
}

function summarizeText(input: string, locale: Locale) {
  const summary = input.replace(/\s+/g, " ").trim().slice(0, 140);
  const prefix = locale === "zh" ? "总结：" : "Summary: ";
  return `${prefix}${summary}${input.length > 140 ? "…" : ""}`;
}

function explainText(input: string, locale: Locale) {
  const prefix =
    locale === "zh"
      ? "这段内容主要在表达："
      : "This passage is mainly communicating: ";
  return `${prefix}${input.replace(/\s+/g, " ").trim()}`;
}

function runCustomPrompt(input: string, prompt: string, locale: Locale) {
  const label = locale === "zh" ? "按要求改写：" : "Prompt-applied rewrite: ";
  const safePrompt = prompt || (locale === "zh" ? "保持原意，优化表达" : "Keep meaning, improve clarity");
  return `${label}${safePrompt}\n\n${escapeHtml(input)}`.replace(/&quot;/g, '"');
}
