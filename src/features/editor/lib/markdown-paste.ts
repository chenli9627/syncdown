"use client";

import type { Editor } from "@tiptap/react";
import {
  markdownToEditorHtml,
  validateStandaloneMarkdownAssets,
  validateSupportedMarkdown,
} from "@/features/editor/lib/markdown";

export function shouldParseMarkdownPaste(text: string) {
  const normalized = text.replace(/\r\n?/g, "\n").trim();

  if (!normalized || !looksLikeStructuredMarkdown(normalized)) {
    return false;
  }

  const validation = validateSupportedMarkdown(normalized);

  if (!validation.ok) {
    return false;
  }

  return validateStandaloneMarkdownAssets(normalized).ok;
}

export function insertMarkdownPaste(editor: Editor, text: string) {
  const normalized = text.replace(/\r\n?/g, "\n").trim();

  if (!shouldParseMarkdownPaste(normalized)) {
    return false;
  }

  const before = JSON.stringify(editor.state.doc.toJSON());
  const applied = editor.chain().focus().insertContent(markdownToEditorHtml(normalized)).run();
  const after = JSON.stringify(editor.state.doc.toJSON());

  return applied && before !== after;
}

function looksLikeStructuredMarkdown(text: string) {
  if (
    /^#{1,6}\s+\S/m.test(text) ||
    /^>\s+\S/m.test(text) ||
    /^```[\w+-]*$/m.test(text) ||
    /^---+$/m.test(text) ||
    /^!\[[^\]]*]\((.+?)\)$/m.test(text) ||
    isMarkdownTable(text) ||
    /^- \[(?: |x|X)\]\s+\S/m.test(text)
  ) {
    return true;
  }

  const bulletCount = text.match(/^(?:- |\* )\S.+$/gm)?.length ?? 0;
  const orderedCount = text.match(/^\d+\.\s+\S.+$/gm)?.length ?? 0;

  if (bulletCount >= 2 || orderedCount >= 2) {
    return true;
  }

  return hasMultilineMarkdownSignals(text);
}

function isMarkdownTable(text: string) {
  const lines = text.split("\n");

  for (let index = 0; index < lines.length - 1; index += 1) {
    const header = lines[index]?.trim() ?? "";
    const separator = lines[index + 1]?.trim() ?? "";

    if (!header.startsWith("|") || !header.endsWith("|")) {
      continue;
    }

    if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(separator)) {
      return true;
    }
  }

  return false;
}

function hasMultilineMarkdownSignals(text: string) {
  if (!text.includes("\n")) {
    return false;
  }

  const inlineMarkdownPattern =
    /(?<!!)\[[^\]]+\]\((?:[^)\s]+)\)|~~[^~]+~~|\*\*[^*]+\*\*|`[^`]+`|(?:^|\s)_(?:[^_\n]+)_(?=\s|$)|(?:^|\s)\*(?:[^*\n]+)\*(?=\s|$)/m;

  if (!inlineMarkdownPattern.test(text)) {
    return false;
  }

  const nonEmptyLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return nonEmptyLines.length >= 2;
}
