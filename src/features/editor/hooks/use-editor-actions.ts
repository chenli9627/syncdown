"use client";

import type { Editor } from "@tiptap/react";
import { useMemo } from "react";
import type {
  EditorActionBaseArgs,
  EditorBlockMenuState,
} from "@/features/editor/lib/editor-action-types";
import { useEditorBlockActions } from "@/features/editor/hooks/use-editor-block-actions";
import { useEditorSearchMarkdownActions } from "@/features/editor/hooks/use-editor-search-markdown-actions";
import { insertImageFile } from "@/features/editor/lib/image";
import type { HoveredBlock } from "@/features/editor/lib/types";
import {
  getBlockTransformActiveId,
  getImageSourceAtPos,
} from "@/features/editor/lib/utils";

type UseEditorActionsArgs = {
  blockMenu: EditorBlockMenuState;
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
      | EditorBlockMenuState
      | ((current: EditorBlockMenuState) => EditorBlockMenuState),
  ) => void;
  setHoveredBlock: (value: HoveredBlock | null) => void;
  openSlashMenuFromEditor: (options?: {
    removeTriggerOnClose?: boolean;
    slashContextOverride?: import("@/features/editor/lib/types").SlashContext;
  }) => void;
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
  openSlashMenuFromEditor,
  status,
  setSearchMatchCount,
  setSearchMatchIndex,
  setSearchNotice,
  setSearchRects,
  syncHoveredBlockFromPos,
}: UseEditorActionsArgs) {
  function getImageDownloadName(extension: string) {
    const base = document.title?.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").replace(/\s+/g, "-") || "syncdown-image";
    const suffix = blockMenu.pos != null ? `${blockMenu.pos}` : `${Date.now()}`;

    return `${base}-image-${suffix}.${extension}`;
  }

  function inferImageExtension(src: string, mimeType: string) {
    if (mimeType === "image/png") return "png";
    if (mimeType === "image/jpeg") return "jpg";
    if (mimeType === "image/webp") return "webp";
    if (mimeType === "image/gif") return "gif";

    const dataMatch = src.match(/^data:image\/([a-zA-Z0-9+.-]+);/);

    if (dataMatch?.[1]) {
      return dataMatch[1].replace("jpeg", "jpg");
    }

    try {
      const url = new URL(src, globalThis.location?.href);
      const path = url.pathname.split("/").pop() ?? "";
      const ext = path.split(".").pop()?.toLowerCase();

      if (ext) {
        return ext;
      }
    } catch {
      // fall through
    }

    return "png";
  }

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
  const isImageBlock = currentTransformActiveId === "image";

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
    openSlashMenuFromEditor,
    setBlockMenu,
    setHoveredBlock,
    syncHoveredBlockFromPos,
  });
  const searchMarkdownActions = useEditorSearchMarkdownActions(actionBaseArgs);

  async function handleInsertImage(file: File, position?: number) {
    if (!editor || !canEditBody) {
      return;
    }

    const result = await insertImageFile(editor, file, {
      position,
    });

    if (!result.ok) {
      setActionError(result.error);
      setActionNotice(null);
      return;
    }

    setActionError(null);
    setActionNotice("Image added");
  }

  async function handleCopyImage() {
    if (!editor || blockMenu.pos == null) {
      return;
    }

    const src = getImageSourceAtPos(editor, blockMenu.pos);

    if (!src) {
      return;
    }

    if (!("clipboard" in navigator) || !("ClipboardItem" in window)) {
      setActionError("Copy image is not supported here");
      setActionNotice(null);
      return;
    }

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type || "image/png"]: blob,
        }),
      ]);
      setActionError(null);
      setActionNotice("Image copied");
      setBlockMenu((current) => ({
        ...current,
        open: false,
        pos: null,
        showTurnInto: false,
      }));
    } catch {
      setActionError("Failed to copy image");
      setActionNotice(null);
    }
  }

  async function handleDownloadImage() {
    if (!editor || blockMenu.pos == null) {
      return;
    }

    const src = getImageSourceAtPos(editor, blockMenu.pos);

    if (!src) {
      return;
    }

    try {
      const browserDocument = globalThis.document;

      if (!browserDocument) {
        return;
      }

      const response = await fetch(src);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const extension = inferImageExtension(src, blob.type);
      const link = browserDocument.createElement("a");
      link.href = downloadUrl;
      link.download = getImageDownloadName(extension);
      browserDocument.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      setActionError(null);
      setActionNotice("Image downloaded");
      setBlockMenu((current) => ({
        ...current,
        open: false,
        pos: null,
        showTurnInto: false,
      }));
    } catch {
      setActionError("Failed to download image");
      setActionNotice(null);
    }
  }

  return {
    canUndo,
    currentTransformActiveId,
    handleCopyImage,
    handleDeleteBlock: blockActions.handleDeleteBlock,
    handleDownloadImage,
    handleDuplicateBlock: blockActions.handleDuplicateBlock,
    handleExportMarkdown: searchMarkdownActions.handleExportMarkdown,
    handleExportMarkdownZip: searchMarkdownActions.handleExportMarkdownZip,
    handleImportMarkdown: searchMarkdownActions.handleImportMarkdown,
    handleInsertImage,
    handleInsertBlockBefore: blockActions.handleInsertBlockBefore,
    handleTurnInto: blockActions.handleTurnInto,
    isImageBlock,
    runSearch: searchMarkdownActions.runSearch,
    statusLabel,
  };
}
