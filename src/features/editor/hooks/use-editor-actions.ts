"use client";

import type { Editor } from "@tiptap/react";
import { useMemo } from "react";
import {
  exportEditorMarkdown,
  importEditorMarkdown,
} from "@/features/editor/lib/editor-markdown-actions";
import type {
  EditorActionBaseArgs,
  EditorBlockMenuState,
} from "@/features/editor/lib/editor-action-types";
import { runEditorSearch } from "@/features/editor/lib/editor-search-actions";
import type { BlockTransformItem, HoveredBlock } from "@/features/editor/lib/types";
import { getBlockTransformActiveId } from "@/features/editor/lib/utils";

type UseEditorActionsArgs = {
  blockMenu: {
    left: number;
    open: boolean;
    pos: number | null;
    showTurnInto: boolean;
    top: number;
  };
  canEditBody: boolean;
  document: {
    content: string;
    id: string;
    title: string;
  };
  editor: Editor | null;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  hoveredBlock: HoveredBlock | null;
  saveDocument: (
    documentId: string,
    patch: { content?: string; title?: string },
  ) => Promise<
    { error: string; ok: false } | { ok: true; document: { title: string } | null }
  >;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchMatchIndex: number;
  searchQuery: string;
  setActionError: (value: string | null) => void;
  setActionNotice: (value: string | null) => void;
  setBlockMenu: (
    value:
      | {
          left: number;
          open: boolean;
          pos: number | null;
          showTurnInto: boolean;
          top: number;
        }
      | ((current: {
            left: number;
            open: boolean;
            pos: number | null;
            showTurnInto: boolean;
            top: number;
          }) => {
            left: number;
            open: boolean;
            pos: number | null;
            showTurnInto: boolean;
            top: number;
          }),
  ) => void;
  setHoveredBlock: (value: HoveredBlock | null) => void;
  status: "idle" | "saving" | "saved" | "error";
  setSearchMatchCount: (value: number) => void;
  setSearchMatchIndex: (value: number) => void;
  setSearchNotice: (value: string | null) => void;
  setSearchRects: EditorActionBaseArgs["setSearchRects"];
  syncHoveredBlockFromPos: (position: number) => void;
};

function closeBlockMenu(setBlockMenu: (value: EditorBlockMenuState) => void) {
  setBlockMenu({
    left: 0,
    open: false,
    pos: null,
    showTurnInto: false,
    top: 0,
  });
}

export function useEditorActions({
  blockMenu,
  canEditBody,
  document,
  editor,
  editorContainerRef,
  hoveredBlock,
  saveDocument,
  searchInputRef,
  searchMatchIndex,
  searchQuery,
  setActionError,
  setActionNotice,
  setBlockMenu,
  setHoveredBlock,
  setSearchMatchCount,
  setSearchMatchIndex,
  setSearchNotice,
  setSearchRects,
  syncHoveredBlockFromPos,
}: UseEditorActionsArgs) {
  const statusLabel =
    status === "saving"
      ? "Saving..."
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Save failed"
          : null;
  const currentTransformActiveId = useMemo(
    () =>
      editor && blockMenu.pos != null
        ? getBlockTransformActiveId(editor, blockMenu.pos)
        : null,
    [blockMenu.pos, editor],
  );

  const canUndo = Boolean(editor?.can().chain().focus().undo().run());

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

    editor
      .chain()
      .focus()
      .insertContentAt(duplicatedPos, node.toJSON())
      .run();
    closeBlockMenu(setBlockMenu);
    window.requestAnimationFrame(() => {
      syncHoveredBlockFromPos(duplicatedPos);
    });
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
    window.requestAnimationFrame(() => {
      syncHoveredBlockFromPos(blockMenu.pos ?? 0);
    });
  }

  function runSearch(direction: "forward" | "backward") {
    runEditorSearch(
      {
        blockMenu,
        canEditBody,
        document,
        editor,
        editorContainerRef,
        hoveredBlock,
        saveDocument,
        searchInputRef,
        searchMatchIndex,
        searchQuery,
        setActionError,
        setActionNotice,
        setBlockMenu,
        setHoveredBlock,
        setSearchMatchCount,
        setSearchMatchIndex,
        setSearchNotice,
        setSearchRects,
        syncHoveredBlockFromPos,
      },
      direction,
    );
  }

  async function handleExportMarkdown() {
    exportEditorMarkdown({ document, editor, setActionError, setActionNotice });
  }

  async function handleImportMarkdown(file: File) {
    await importEditorMarkdown(
      {
        blockMenu,
        canEditBody,
        document,
        editor,
        editorContainerRef,
        hoveredBlock,
        saveDocument,
        searchInputRef,
        searchMatchIndex,
        searchQuery,
        setActionError,
        setActionNotice,
        setBlockMenu,
        setHoveredBlock,
        setSearchMatchCount,
        setSearchMatchIndex,
        setSearchNotice,
        setSearchRects,
        syncHoveredBlockFromPos,
      },
      file,
    );
  }

  return {
    canUndo,
    currentTransformActiveId,
    handleDeleteBlock,
    handleDuplicateBlock,
    handleExportMarkdown,
    handleImportMarkdown,
    handleInsertBlockBefore,
    handleTurnInto,
    runSearch,
    statusLabel,
  };
}
