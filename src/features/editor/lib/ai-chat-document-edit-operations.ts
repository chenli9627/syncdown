import type { Editor } from "@tiptap/react";
import type { ExecutableOperation } from "@/features/editor/lib/ai-chat-document-edit-types";

export function applyExecutableOperation(editor: Editor, operation: ExecutableOperation) {
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

  if (operation.type === "update_table_cell") {
    editor.chain().focus().insertContentAt(operation.range, operation.content).run();
    return;
  }

  editor.chain().focus().insertContentAt(operation.position, operation.content).run();
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
