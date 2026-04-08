"use client";

import type { Editor } from "@tiptap/react";
import type { EditorBlockMenuState } from "@/features/editor/lib/editor-action-types";
import type { BlockTransformItem, HoveredBlock } from "@/features/editor/lib/types";

function closeBlockMenu(setBlockMenu: (value: EditorBlockMenuState) => void) {
  setBlockMenu({
    left: 0,
    open: false,
    pos: null,
    showTurnInto: false,
    top: 0,
  });
}

type UseEditorBlockActionsArgs = {
  blockMenu: EditorBlockMenuState;
  editor: Editor | null;
  hoveredBlock: HoveredBlock | null;
  setBlockMenu: (value: EditorBlockMenuState) => void;
  setHoveredBlock: (value: HoveredBlock | null) => void;
  syncHoveredBlockFromPos: (position: number) => void;
};

export function useEditorBlockActions({
  blockMenu,
  editor,
  hoveredBlock,
  setBlockMenu,
  setHoveredBlock,
  syncHoveredBlockFromPos,
}: UseEditorBlockActionsArgs) {
  function handleInsertBlockBefore() {
    if (!editor || !hoveredBlock) {
      return;
    }
    closeBlockMenu(setBlockMenu);
    editor
      .chain()
      .focus()
      .insertContentAt(hoveredBlock.pos, {
        type: "paragraph",
        content: [{ type: "text", text: "/" }],
      })
      .setTextSelection(hoveredBlock.pos + 2)
      .run();
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
