import type { Editor } from "@tiptap/react";
import type {
  AiChatDocumentAction,
  AiChatMessage,
} from "@/features/app-state/types";
import { toAiInlineInsertHtml, toAiInsertHtml } from "@/features/editor/lib/ai";

export function inferAiChatDocumentAction(prompt: string): AiChatDocumentAction | null {
  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");
  const lowerPrompt = prompt.toLowerCase();

  if (
    /(?:放到|插入到|添加到|加到|追加到).{0,12}(?:文档)?(?:末尾|最后|结尾|底部)/.test(
      compactPrompt,
    ) ||
    /(?:文档)?(?:末尾|最后|结尾|底部).{0,12}(?:放|插入|添加|加|追加)/.test(
      compactPrompt,
    )
  ) {
    return "insert_end";
  }

  if (
    /\b(?:append|insert|add|place)\b[\s\S]{0,120}\b(?:end|bottom)\b[\s\S]{0,60}\b(?:document|doc|page)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:append|insert|add|place)\b[\s\S]{0,120}\b(?:document|doc|page)\b[\s\S]{0,60}\b(?:end|bottom)\b/.test(
      lowerPrompt,
    )
  ) {
    return "insert_end";
  }

  return null;
}

export function getAiChatMessageText(message: AiChatMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

export function replaceSelectionWithAiResponse(
  editor: Editor | null,
  message: AiChatMessage,
  text: string,
) {
  if (!editor) {
    return;
  }

  const currentSelection = editor.state.selection;

  if (!currentSelection.empty) {
    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: currentSelection.from, to: currentSelection.to },
        getAiInsertContentForRange(editor, currentSelection.from, currentSelection.to, text),
      )
      .run();
    return;
  }

  const originalSelection = message.metadata?.selection;

  if (originalSelection) {
    const from = Math.max(0, Math.min(originalSelection.from, editor.state.doc.content.size));
    const to = Math.max(from, Math.min(originalSelection.to, editor.state.doc.content.size));

    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, getAiInsertContentForRange(editor, from, to, text))
      .run();
  }
}

export function insertAiResponseAtCursor(editor: Editor | null, text: string) {
  if (!editor) {
    return;
  }

  const { from, to } = editor.state.selection;

  editor
    .chain()
    .focus()
    .insertContent(getAiInsertContentForRange(editor, from, to, text))
    .run();
}

export function insertAiResponseAtEnd(editor: Editor | null, text: string) {
  if (!editor) {
    return;
  }

  const inlineContent = toAiInlineInsertHtml(text);
  const lastTextblockEnd = getLastTextblockEndPosition(editor);

  if (lastTextblockEnd != null && !isBlockInsertContent(inlineContent)) {
    editor
      .chain()
      .focus()
      .insertContentAt(lastTextblockEnd, inlineContent)
      .run();
    return;
  }

  editor
    .chain()
    .focus()
    .insertContentAt(editor.state.doc.content.size, toAiInsertHtml(text))
    .run();
}

export function appendAiResponseAsDocumentEndBlocks(editor: Editor | null, text: string) {
  if (!editor) {
    return;
  }

  editor
    .chain()
    .focus()
    .insertContentAt(editor.state.doc.content.size, toAiInsertHtml(text))
    .run();
}

function getAiInsertContentForRange(
  editor: Editor,
  from: number,
  to: number,
  text: string,
) {
  return canInsertInlineAtRange(editor, from, to)
    ? toAiInlineInsertHtml(text)
    : toAiInsertHtml(text);
}

function canInsertInlineAtRange(editor: Editor, from: number, to: number) {
  const docSize = editor.state.doc.content.size;
  const safeFrom = Math.max(0, Math.min(from, docSize));
  const safeTo = Math.max(safeFrom, Math.min(to, docSize));
  const $from = editor.state.doc.resolve(safeFrom);
  const $to = editor.state.doc.resolve(safeTo);

  return $from.parent.isTextblock && $from.sameParent($to);
}

function getLastTextblockEndPosition(editor: Editor) {
  let endPosition: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.isTextblock) {
      endPosition = pos + node.nodeSize - 1;
    }
  });

  return endPosition;
}

function isBlockInsertContent(content: string) {
  return /^<(?:blockquote|h[1-6]|hr|img|ol|p|pre|table|ul)(?:\s|>)/i.test(content.trim());
}
