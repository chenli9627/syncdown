import type { Editor } from "@tiptap/react";
import type {
  AiChatDocumentAction,
  AiChatMessage,
} from "@/features/app-state/types";
import { toAiInlineInsertHtml, toAiInsertHtml } from "@/features/editor/lib/ai";
import { sanitizeAiAssistantText } from "@/features/editor/lib/ai-chat-output-guard";

export { inferAiChatDocumentAction } from "@/features/editor/lib/ai-chat-action-inference";

export function getAiChatMessageText(
  message: AiChatMessage,
  documentAction: AiChatDocumentAction | null = null,
) {
  const text = message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();

  return message.role === "assistant" ? sanitizeAiAssistantText(text, documentAction) : text;
}

export function replaceSelectionWithAiResponse(
  editor: Editor | null,
  message: AiChatMessage,
  text: string,
) {
  if (!editor) {
    return false;
  }

  const currentSelection = editor.state.selection;

  if (!currentSelection.empty) {
    return runEditorDocumentMutation(editor, () =>
      editor
        .chain()
        .focus()
        .insertContentAt(
          { from: currentSelection.from, to: currentSelection.to },
          getAiInsertContentForRange(editor, currentSelection.from, currentSelection.to, text),
        )
        .run(),
    );
  }

  const originalSelection = message.metadata?.selection;

  if (originalSelection) {
    const from = Math.max(0, Math.min(originalSelection.from, editor.state.doc.content.size));
    const to = Math.max(from, Math.min(originalSelection.to, editor.state.doc.content.size));

    return runEditorDocumentMutation(editor, () =>
      editor
        .chain()
        .focus()
        .insertContentAt({ from, to }, getAiInsertContentForRange(editor, from, to, text))
        .run(),
    );
  }

  return false;
}

export function insertAiResponseAtCursor(editor: Editor | null, text: string) {
  if (!editor) {
    return false;
  }

  const { from, to } = editor.state.selection;

  return runEditorDocumentMutation(editor, () =>
    editor
      .chain()
      .focus()
      .insertContent(getAiInsertContentForRange(editor, from, to, text))
      .run(),
  );
}

export function insertAiResponseAtEnd(editor: Editor | null, text: string) {
  if (!editor) {
    return false;
  }

  const inlineContent = toAiInlineInsertHtml(text);
  const lastTextblockEnd = getLastTextblockEndPosition(editor);

  if (lastTextblockEnd != null && !isBlockInsertContent(inlineContent)) {
    return runEditorDocumentMutation(editor, () =>
      editor
        .chain()
        .focus()
        .insertContentAt(lastTextblockEnd, inlineContent)
        .run(),
    );
  }

  return runEditorDocumentMutation(editor, () =>
    editor
      .chain()
      .focus()
      .insertContentAt(editor.state.doc.content.size, toAiInsertHtml(text))
      .run(),
  );
}

export function appendAiResponseAsDocumentEndBlocks(editor: Editor | null, text: string) {
  if (!editor) {
    return false;
  }

  return runEditorDocumentMutation(editor, () =>
    editor
      .chain()
      .focus()
      .insertContentAt(editor.state.doc.content.size, toAiInsertHtml(text))
      .run(),
  );
}

export function replaceDocumentWithAiResponse(editor: Editor | null, text: string) {
  if (!editor) {
    return false;
  }

  return runEditorDocumentMutation(editor, () => {
    const didSetContent = editor.commands.setContent(toAiInsertHtml(text));
    editor.commands.focus("end");
    return didSetContent;
  });
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

function runEditorDocumentMutation(editor: Editor, mutation: () => boolean) {
  const before = getEditorDocumentSnapshot(editor);
  const commandApplied = mutation();
  const after = getEditorDocumentSnapshot(editor);

  return commandApplied && before !== after;
}

function getEditorDocumentSnapshot(editor: Editor) {
  return JSON.stringify(editor.state.doc.toJSON());
}
