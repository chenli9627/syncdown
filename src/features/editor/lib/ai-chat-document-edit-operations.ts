import type { Editor } from "@tiptap/react";
import type { ExecutableOperation } from "@/features/editor/lib/ai-chat-document-edit-types";
import { insertContentWithFallback } from "@/features/editor/lib/ai-chat-document-edit-insert-fallback";
import {
  isTableStructureOperation,
  updateTableStructure,
} from "@/features/editor/lib/ai-chat-document-edit-table-operations";

export function applyExecutableOperation(editor: Editor, operation: ExecutableOperation) {
  if (operation.type === "delete_block") {
    editor.chain().focus().deleteRange(operation.range).run();
    return;
  }

  if (operation.type === "replace_text_in_block") {
    replaceRangeText(editor, operation);
    return;
  }

  if (operation.type === "replace_all_text") {
    replaceRangeText(editor, operation);
    return;
  }

  if (operation.type === "replace_block") {
    insertContentWithFallback(editor, operation.range, operation.content);
    return;
  }

  if (operation.type === "move_block" || operation.type === "copy_block") {
    placeBlock(editor, operation);
    return;
  }

  if (operation.type === "set_heading_level") {
    setHeadingLevel(editor, operation);
    return;
  }

  if (operation.type === "set_block_type") {
    setBlockType(editor, operation);
    return;
  }

  if (operation.type === "set_text_marks" || operation.type === "unset_text_marks") {
    updateTextMarks(editor, operation);
    return;
  }

  if (operation.type === "set_link" || operation.type === "unset_link") {
    updateLink(editor, operation);
    return;
  }

  if (operation.type === "set_list_type") {
    setListType(editor, operation);
    return;
  }

  if (operation.type === "set_task_item_checked") {
    setTaskItemChecked(editor, operation);
    return;
  }

  if (operation.type === "update_table_cell") {
    editor.chain().focus().insertContentAt(operation.range, operation.content).run();
    return;
  }

  if (isTableStructureOperation(operation.type)) {
    updateTableStructure(editor, operation);
    return;
  }

  insertContentWithFallback(editor, operation.position, operation.content);
}

function replaceRangeText(editor: Editor, operation: ExecutableOperation) {
  const transaction = editor.state.tr.insertText(
    operation.content,
    operation.range.from,
    operation.range.to,
  );
  editor.view.dispatch(transaction);
  editor.commands.focus();
}

function placeBlock(editor: Editor, operation: ExecutableOperation) {
  if (!operation.nodeJson || operation.targetPosition == null) {
    return;
  }

  const node = editor.state.schema.nodeFromJSON(operation.nodeJson);

  if (operation.type === "copy_block") {
    const transaction = editor.state.tr.insert(operation.targetPosition, node);
    editor.view.dispatch(transaction);
    editor.commands.focus();
    return;
  }

  const size = operation.range.to - operation.range.from;
  const targetPosition =
    operation.targetPosition > operation.range.from
      ? operation.targetPosition - size
      : operation.targetPosition;
  const transaction = editor.state.tr
    .delete(operation.range.from, operation.range.to)
    .insert(targetPosition, node);
  editor.view.dispatch(transaction);
  editor.commands.focus();
}

function setHeadingLevel(editor: Editor, operation: ExecutableOperation) {
  const headingType = editor.state.schema.nodes.heading;

  if (!headingType || !operation.level) {
    return;
  }

  const transaction = editor.state.tr.setNodeMarkup(operation.position, headingType, {
    level: operation.level,
  });
  editor.view.dispatch(transaction);
  editor.commands.focus();
}

function setBlockType(editor: Editor, operation: ExecutableOperation) {
  if (!operation.blockType) {
    return;
  }

  if (operation.blockType === "heading") {
    setHeadingLevel(editor, operation);
    return;
  }

  const nodeType = editor.state.schema.nodes[operation.blockType];

  if (!nodeType) {
    return;
  }

  if (operation.blockType === "codeBlock") {
    const textNode = operation.content ? editor.state.schema.text(operation.content) : undefined;
    const transaction = editor.state.tr.replaceWith(
      operation.range.from,
      operation.range.to,
      nodeType.create(null, textNode),
    );
    editor.view.dispatch(transaction);
    editor.commands.focus();
    return;
  }

  const transaction = editor.state.tr.setNodeMarkup(operation.position, nodeType);
  editor.view.dispatch(transaction);
  editor.commands.focus();
}

function updateTextMarks(editor: Editor, operation: ExecutableOperation) {
  const transaction = editor.state.tr;

  operation.marks?.forEach((mark) => {
    const markType = editor.state.schema.marks[mark];

    if (!markType) {
      return;
    }

    if (operation.type === "set_text_marks") {
      transaction.addMark(operation.range.from, operation.range.to, markType.create());
    } else {
      transaction.removeMark(operation.range.from, operation.range.to, markType);
    }
  });

  editor.view.dispatch(transaction);
  editor.commands.focus();
}

function updateLink(editor: Editor, operation: ExecutableOperation) {
  const linkMark = editor.state.schema.marks.link;

  if (!linkMark) {
    return;
  }

  const transaction = editor.state.tr.removeMark(operation.range.from, operation.range.to, linkMark);

  if (operation.type === "set_link" && operation.href) {
    transaction.addMark(
      operation.range.from,
      operation.range.to,
      linkMark.create({ href: operation.href }),
    );
  }

  editor.view.dispatch(transaction);
  editor.commands.focus();
}

function setListType(editor: Editor, operation: ExecutableOperation) {
  if (!operation.listType || !operation.nodeJson) {
    return;
  }

  const listType = editor.state.schema.nodes[operation.listType];
  const itemType =
    operation.listType === "taskList"
      ? editor.state.schema.nodes.taskItem
      : editor.state.schema.nodes.listItem;
  const paragraphType = editor.state.schema.nodes.paragraph;

  if (!listType || !itemType || !paragraphType) {
    return;
  }

  const items = getListItemTexts(operation.nodeJson).map((text) =>
    itemType.create(
      operation.listType === "taskList" ? { checked: false } : null,
      paragraphType.create(null, text ? editor.state.schema.text(text) : undefined),
    ),
  );
  const transaction = editor.state.tr.replaceWith(
    operation.range.from,
    operation.range.to,
    listType.create(null, items),
  );
  editor.view.dispatch(transaction);
  editor.commands.focus();
}

function setTaskItemChecked(editor: Editor, operation: ExecutableOperation) {
  if (typeof operation.checked !== "boolean") {
    return;
  }

  const node = editor.state.doc.nodeAt(operation.position);

  if (!node || node.type.name !== "taskItem") {
    return;
  }

  const transaction = editor.state.tr.setNodeMarkup(operation.position, undefined, {
    ...node.attrs,
    checked: operation.checked,
  });
  editor.view.dispatch(transaction);
  editor.commands.focus();
}

function getListItemTexts(nodeJson: unknown): string[] {
  const node = asJsonNode(nodeJson);

  if (!node?.content?.length) {
    return [];
  }

  return node.content.map((item) => getJsonText(item));
}

function getJsonText(node: JsonNode): string {
  return [
    node.text ?? "",
    ...(node.content?.map((child) => getJsonText(child)) ?? []),
  ].join("");
}

function asJsonNode(value: unknown): JsonNode | null {
  return value && typeof value === "object" && "type" in value ? (value as JsonNode) : null;
}

type JsonNode = {
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  text?: string;
  type: string;
};
