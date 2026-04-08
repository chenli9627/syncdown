"use client";

import { TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import type { EditorBlockMenuState } from "@/features/editor/lib/editor-action-types";
import type { BlockTransformItem, HoveredBlock, SlashContext } from "@/features/editor/lib/types";

function closeBlockMenu(setBlockMenu: (value: EditorBlockMenuState) => void) {
  setBlockMenu({
    left: 0,
    open: false,
    pos: null,
    showTurnInto: false,
    turnIntoAlign: "top",
    top: 0,
  });
}

type UseEditorBlockActionsArgs = {
  blockMenu: EditorBlockMenuState;
  editor: Editor | null;
  hoveredBlock: HoveredBlock | null;
  openSlashMenuFromEditor: (options?: {
    removeTriggerOnClose?: boolean;
    slashContextOverride?: SlashContext;
  }) => void;
  setBlockMenu: (value: EditorBlockMenuState) => void;
  setHoveredBlock: (value: HoveredBlock | null) => void;
  syncHoveredBlockFromPos: (position: number) => void;
};

export function useEditorBlockActions({
  blockMenu,
  editor,
  hoveredBlock,
  openSlashMenuFromEditor,
  setBlockMenu,
  setHoveredBlock,
  syncHoveredBlockFromPos,
}: UseEditorBlockActionsArgs) {
  function handleInsertBlockBefore() {
    if (!editor || !hoveredBlock) {
      return;
    }

    const paragraphNode = editor.state.schema.nodes.paragraph;
    const currentNode =
      editor.state.doc.nodeAt(hoveredBlock.pos) ??
      editor.state.doc.resolve(hoveredBlock.pos).nodeAfter;

    if (!paragraphNode || !currentNode) {
      return;
    }

    const insertedPos = hoveredBlock.pos + currentNode.nodeSize;

    closeBlockMenu(setBlockMenu);
    const transaction = editor.state.tr.insert(insertedPos, paragraphNode.create());
    transaction.setSelection(TextSelection.create(transaction.doc, insertedPos + 1));
    editor.view.dispatch(transaction);
    editor.view.focus();

    window.requestAnimationFrame(() => {
      editor.chain().focus(insertedPos + 1).insertContent("/").run();
      window.requestAnimationFrame(() => {
        openSlashMenuFromEditor({
          removeTriggerOnClose: true,
        });
        syncHoveredBlockFromPos(insertedPos);
      });
    });
  }

  function handleDuplicateBlock() {
    if (!editor || blockMenu.pos == null) {
      return;
    }
    const node = editor.state.doc.nodeAt(blockMenu.pos);
    if (!node) {
      return;
    }
    const duplicatedPos = blockMenu.pos + node.nodeSize;
    editor.chain().focus().insertContentAt(duplicatedPos, node.toJSON()).run();
    closeBlockMenu(setBlockMenu);
    window.requestAnimationFrame(() => syncHoveredBlockFromPos(duplicatedPos));
  }

  function handleDeleteBlock() {
    if (!editor || blockMenu.pos == null) {
      return;
    }
    const node = editor.state.doc.nodeAt(blockMenu.pos);
    if (!node) {
      return;
    }
    editor
      .chain()
      .focus()
      .deleteRange({ from: blockMenu.pos, to: blockMenu.pos + node.nodeSize })
      .run();
    closeBlockMenu(setBlockMenu);
    setHoveredBlock(null);
  }

  function handleTurnInto(item: BlockTransformItem) {
    if (!editor || blockMenu.pos == null) {
      return;
    }
    item.run(editor, blockMenu.pos);
    closeBlockMenu(setBlockMenu);
    window.requestAnimationFrame(() => syncHoveredBlockFromPos(blockMenu.pos ?? 0));
  }

  return {
    handleDeleteBlock,
    handleDuplicateBlock,
    handleInsertBlockBefore,
    handleTurnInto,
  };
}
