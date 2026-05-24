import type { Locale } from "@/lib/i18n/messages";
import { toEditorContent } from "@/features/editor/lib/content";
import { markdownToEditorHtml } from "@/features/editor/lib/markdown";
import { decodeHtmlEntities } from "@/lib/html-entities";

export type AiActionKind =
  | "improve_writing"
  | "explain"
  | "reformat"
  | "summarize"
  | "custom";

export type AiRequestPayload = {
  action: AiActionKind;
  candidateCount?: 1 | 2;
  locale: Locale;
  prompt?: string;
  selectedText: string;
};

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
  const trimmed = resultText.trim();

  if (!trimmed) {
    return "<p></p>";
  }

  if (isTrustedEditorHtml(trimmed)) {
    return toEditorContent(resultText);
  }

  return markdownToEditorHtml(decodeHtmlEntities(resultText));
}

export function toAiInlineInsertHtml(resultText: string) {
  const html = toAiInsertHtml(resultText);
  return unwrapSingleParagraphHtml(html) ?? html;
}

function unwrapSingleParagraphHtml(html: string) {
  const trimmed = html.trim();

  if (!trimmed.startsWith("<p>") || !trimmed.endsWith("</p>")) {
    return null;
  }

  const innerHtml = trimmed.slice(3, -4);

  if (innerHtml.includes("<p") || innerHtml.includes("</p>")) {
    return null;
  }

  return innerHtml;
}

function isTrustedEditorHtml(input: string) {
  if (!input.startsWith("<")) {
    return false;
  }

  if (/^<\/?(?:script|style|html|head|body|iframe|object|embed|form|input|button|select|textarea|meta|link)\b/i.test(input)) {
    return false;
  }

  return /^<(?:p|h[1-6]|blockquote|ul|ol|li|table|thead|tbody|tr|td|th|pre|code|strong|em|s|a|img|hr|br)\b/i.test(input);
}
