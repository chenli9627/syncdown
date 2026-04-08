"use client";

import type { Editor } from "@tiptap/react";
import { useMemo } from "react";
import type { EditorActionBaseArgs } from "@/features/editor/lib/editor-action-types";
import { useEditorBlockActions } from "@/features/editor/hooks/use-editor-block-actions";
import { useEditorSearchMarkdownActions } from "@/features/editor/hooks/use-editor-search-markdown-actions";
import type { HoveredBlock } from "@/features/editor/lib/types";
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
  status,
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
  const actionBaseArgs: EditorActionBaseArgs = {
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
  };
  const blockActions = useEditorBlockActions({
    blockMenu,
    editor,
    hoveredBlock,
    setBlockMenu,
    setHoveredBlock,
    syncHoveredBlockFromPos,
  });
  const searchMarkdownActions = useEditorSearchMarkdownActions(actionBaseArgs);

  return {
    canUndo,
    currentTransformActiveId,
    handleDeleteBlock: blockActions.handleDeleteBlock,
    handleDuplicateBlock: blockActions.handleDuplicateBlock,
    handleExportMarkdown: searchMarkdownActions.handleExportMarkdown,
    handleImportMarkdown: searchMarkdownActions.handleImportMarkdown,
    handleInsertBlockBefore: blockActions.handleInsertBlockBefore,
    handleTurnInto: blockActions.handleTurnInto,
    runSearch: searchMarkdownActions.runSearch,
    statusLabel,
  };
}
