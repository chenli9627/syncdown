import { DOMSerializer } from "@tiptap/pm/model";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import type { AiChatDocumentBlock } from "@/features/app-state/types";
import type { LocalAiDocumentBlock } from "@/features/editor/lib/ai-chat-document-edit-types";
import { editorHtmlToMarkdown } from "@/features/editor/lib/markdown";

export function getLocalAiDocumentBlocks(editor: Editor | null): LocalAiDocumentBlock[] {
  if (!editor) {
    return [];
  }

  const blocks: LocalAiDocumentBlock[] = [];

  editor.state.doc.forEach((node, offset, index) => {
    const text = getNodeText(node);
    const html = getNodeHtml(editor, node).trim();
    const markdown = html ? editorHtmlToMarkdown(html).trim() : "";

    blocks.push({
      html: hasRichMarkup(html) ? html : undefined,
      id: `block_${index + 1}`,
      level: typeof node.attrs.level === "number" ? node.attrs.level : undefined,
      markdown: markdown && markdown !== text ? markdown : undefined,
      node,
      nodeSize: node.nodeSize,
      pos: offset,
      text,
      type: node.type.name,
    });
  });

  return blocks;
}

export function toAiDocumentBlock({
  html,
  id,
  level,
  markdown,
  text,
  type,
}: LocalAiDocumentBlock): AiChatDocumentBlock {
  return {
    html,
    id,
    level,
    markdown,
    text,
    type,
  };
}

function getNodeText(node: { textContent: string; type: { name: string } }) {
  const text = node.textContent.trim();

  if (text) {
    return text;
  }

  if (node.type.name === "horizontalRule") {
    return "[horizontal rule]";
  }

  return "";
}

function getNodeHtml(editor: Editor, node: ProseMirrorNode) {
  if (typeof document === "undefined" || typeof DOMParser === "undefined") {
    return "";
  }

  const container = document.createElement("div");
  const serializer = DOMSerializer.fromSchema(editor.schema);
  container.append(serializer.serializeNode(node, { document }));

  return container.innerHTML;
}

function hasRichMarkup(html: string) {
  return /<(?:a|blockquote|code|del|em|h[1-6]|li|ol|pre|s|strike|strong|table|ul)\b/i.test(
    html,
  );
}
