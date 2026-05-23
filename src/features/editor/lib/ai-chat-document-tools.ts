import type { Editor } from "@tiptap/react";
import { DOMSerializer } from "@tiptap/pm/model";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { AiChatDocumentBlock } from "@/features/app-state/types";
import { toAiInsertHtml } from "@/features/editor/lib/ai";
import { editorHtmlToMarkdown } from "@/features/editor/lib/markdown";

type LocalAiDocumentBlock = AiChatDocumentBlock & {
  node: ProseMirrorNode;
  nodeSize: number;
  pos: number;
};

type AiDocumentEditOperation = {
  blockId: string;
  content?: string;
  replacementText?: string;
  targetText?: string;
  type:
    | "delete_block"
    | "insert_after_block"
    | "insert_before_block"
    | "replace_block"
    | "replace_text_in_block";
};

type AiDocumentEditPayload = {
  operations?: AiDocumentEditOperation[];
  summary?: string;
};

export function getAiDocumentBlocks(editor: Editor | null): AiChatDocumentBlock[] {
  return getLocalAiDocumentBlocks(editor).map(({ html, id, level, markdown, text, type }) => ({
    html,
    id,
    level,
    markdown,
    text,
    type,
  }));
}

export function applyAiDocumentEditToolResponse(editor: Editor | null, responseText: string) {
  if (!editor) {
    return 0;
  }

  const payload = parseAiDocumentEditPayload(responseText);

  if (!payload?.operations?.length) {
    return 0;
  }

  const blocks = getLocalAiDocumentBlocks(editor);
  const operations = payload.operations
    .map((operation, index) => toExecutableOperation(operation, blocks, index))
    .filter((operation): operation is ExecutableOperation => Boolean(operation))
    .sort((a, b) => b.position - a.position || b.index - a.index);

  operations.forEach((operation) => {
    if (operation.type === "delete_block") {
      editor.chain().focus().deleteRange(operation.range).run();
      return;
    }

    if (operation.type === "replace_text_in_block") {
      const transaction = editor.state.tr.insertText(
        operation.content,
        operation.range.from,
        operation.range.to,
      );
      editor.view.dispatch(transaction);
      editor.commands.focus();
      return;
    }

    if (operation.type === "replace_block") {
      editor.chain().focus().insertContentAt(operation.range, operation.content).run();
      return;
    }

    editor.chain().focus().insertContentAt(operation.position, operation.content).run();
  });

  return operations.length;
}

export function getAiDocumentEditToolSummary(responseText: string) {
  const payload = parseAiDocumentEditPayload(responseText);

  if (!payload?.operations?.length) {
    return null;
  }

  return payload.summary?.trim() || "Document edit operations generated.";
}

function getLocalAiDocumentBlocks(editor: Editor | null): LocalAiDocumentBlock[] {
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

type ExecutableOperation = {
  content: string;
  index: number;
  position: number;
  range: { from: number; to: number };
  type: AiDocumentEditOperation["type"];
};

function toExecutableOperation(
  operation: AiDocumentEditOperation,
  blocks: LocalAiDocumentBlock[],
  index: number,
): ExecutableOperation | null {
  const block = blocks.find((candidate) => candidate.id === operation.blockId);

  if (!block) {
    return null;
  }

  if (operation.type === "replace_text_in_block") {
    const targetText = operation.targetText;

    if (!targetText) {
      return null;
    }

    const range = findTextRangeInBlock(block, targetText);

    if (!range) {
      return null;
    }

    return {
      content: operation.replacementText ?? "",
      index,
      position: range.from,
      range,
      type: operation.type,
    };
  }

  const range = { from: block.pos, to: block.pos + block.nodeSize };
  const position = operation.type === "insert_after_block" ? range.to : range.from;
  const content = operation.content?.trim() ? toAiInsertHtml(operation.content) : "";

  if (operation.type !== "delete_block" && !content) {
    return null;
  }

  return {
    content,
    index,
    position,
    range,
    type: operation.type,
  };
}

function parseAiDocumentEditPayload(responseText: string): AiDocumentEditPayload | null {
  const jsonText = extractJsonObject(responseText);

  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as AiDocumentEditPayload;
    return Array.isArray(parsed.operations) ? parsed : null;
  } catch {
    return null;
  }
}

function extractJsonObject(responseText: string) {
  const trimmed = responseText.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fencedMatch?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  return start >= 0 && end > start ? candidate.slice(start, end + 1) : null;
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

function findTextRangeInBlock(block: LocalAiDocumentBlock, targetText: string) {
  const segments: Array<{
    from: number;
    textEnd: number;
    textStart: number;
    to: number;
  }> = [];
  let blockText = "";

  block.node.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }

    const textStart = blockText.length;
    blockText += node.text;
    segments.push({
      from: block.pos + 1 + pos,
      textEnd: blockText.length,
      textStart,
      to: block.pos + 1 + pos + node.text.length,
    });
  });

  const targetStart = blockText.indexOf(targetText);

  if (targetStart < 0) {
    return null;
  }

  const targetEnd = targetStart + targetText.length;
  const startSegment = segments.find(
    (segment) => segment.textStart <= targetStart && targetStart < segment.textEnd,
  );
  const endSegment = segments.find(
    (segment) => segment.textStart < targetEnd && targetEnd <= segment.textEnd,
  );

  if (!startSegment || !endSegment) {
    return null;
  }

  return {
    from: startSegment.from + targetStart - startSegment.textStart,
    to: endSegment.from + targetEnd - endSegment.textStart,
  };
}

function hasRichMarkup(html: string) {
  return /<(?:a|blockquote|code|del|em|h[1-6]|li|ol|pre|s|strike|strong|table|ul)\b/i.test(
    html,
  );
}
