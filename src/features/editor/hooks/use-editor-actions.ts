"use client";

import type { Editor } from "@tiptap/react";
import { useMemo } from "react";
import { TextSelection } from "@tiptap/pm/state";
import { useLocale } from "@/components/providers/locale-provider";
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
  setOverflowMenuOpen: (value: boolean | ((current: boolean) => boolean)) => void;
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
  setOverflowMenuOpen,
  openSlashMenuFromEditor,
  status,
  setSearchMatchCount,
  setSearchMatchIndex,
  setSearchNotice,
  setSearchRects,
  syncHoveredBlockFromPos,
}: UseEditorActionsArgs) {
  const { t } = useLocale();
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
      ? t("saving")
      : status === "saved"
        ? t("saved")
        : status === "error"
          ? t("saveFailed")
          : null;
  const currentTransformActiveId = useMemo(
    () =>
      editor && blockMenu.pos != null
        ? getBlockTransformActiveId(editor, blockMenu.pos)
        : null,
    [blockMenu.pos, editor],
  );
  const isImageBlock = currentTransformActiveId === "image";
  const isTableBlock = currentTransformActiveId === "table";

  const canUndo = Boolean(editor?.can().chain().focus().undo().run());
  const actionBaseArgs: EditorActionBaseArgs = {
    blockMenu,
    canEditBody,
    document,
    editor,
    editorContainerRef,
    hoveredBlock,
    saveDocument,
    searchEmptyLabel: t("enterTextToSearch"),
    searchInputRef,
    searchMatchIndex,
    searchNoMatchLabel: t("noMatchFound"),
    searchQuery,
    setActionError,
    setActionNotice,
    setBlockMenu,
    setHoveredBlock,
    setOverflowMenuOpen,
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

  function getTableSelectionPos(
    currentEditor: Editor,
    tablePos: number,
    target: "bottom-edge" | "left-edge" | "right-edge" | "top-edge",
  ) {
    const domNode = currentEditor.view.nodeDOM(tablePos);
    const tableElement =
      (domNode instanceof HTMLElement ? domNode : domNode?.parentElement)?.closest("table") ?? null;

    if (!(tableElement instanceof HTMLTableElement) || tableElement.rows.length === 0) {
      return Math.min(tablePos + 3, currentEditor.state.doc.content.size);
    }

    const targetRowIndex = target === "bottom-edge" ? tableElement.rows.length - 1 : 0;
    const row = tableElement.rows.item(targetRowIndex);

    if (!row || row.cells.length === 0) {
      return Math.min(tablePos + 3, currentEditor.state.doc.content.size);
    }

    const targetCellIndex = target === "right-edge" ? row.cells.length - 1 : 0;
    const cell = row.cells.item(targetCellIndex);

    if (!cell) {
      return Math.min(tablePos + 3, currentEditor.state.doc.content.size);
    }

    try {
      return Math.min(currentEditor.view.posAtDOM(cell, 0) + 1, currentEditor.state.doc.content.size);
    } catch {
      return Math.min(tablePos + 3, currentEditor.state.doc.content.size);
    }
  }

  function updateTable(
    command: (currentEditor: Editor) => boolean,
    selectionTarget?: "bottom-edge" | "left-edge" | "right-edge" | "top-edge",
  ) {
    const tablePos = blockMenu.pos ?? hoveredBlock?.pos ?? null;

    if (!editor || tablePos == null) {
      return;
    }

    const selectionPos = selectionTarget
      ? getTableSelectionPos(editor, tablePos, selectionTarget)
      : Math.min(tablePos + 3, editor.state.doc.content.size);
    editor.chain().focus().setTextSelection(selectionPos).run();

    if (!command(editor)) {
      setActionError("Failed to update table");
      setActionNotice(null);
      return;
    }

    setActionError(null);
    setActionNotice("Table updated");
    setBlockMenu((current) => ({
      ...current,
      open: false,
      pos: null,
      showTurnInto: false,
    }));
    requestAnimationFrame(() => {
      syncHoveredBlockFromPos(tablePos);
      requestAnimationFrame(() => {
        syncHoveredBlockFromPos(tablePos);
      });
    });
  }

  function getTableNode(tablePos: number) {
    const tableNode = editor?.state.doc.nodeAt(tablePos);
    return tableNode?.type.name === "table" ? tableNode : null;
  }

  function getTableCellSelectionPos(
    currentEditor: Editor,
    tablePos: number,
    rowIndex: number,
    columnIndex: number,
  ) {
    const tableNode = currentEditor.state.doc.nodeAt(tablePos);

    if (!tableNode || tableNode.type.name !== "table") {
      return Math.min(tablePos + 3, currentEditor.state.doc.content.size);
    }

    let rowPos = tablePos + 1;

    for (let currentRowIndex = 0; currentRowIndex < tableNode.childCount; currentRowIndex += 1) {
      const rowNode = tableNode.child(currentRowIndex);

      if (currentRowIndex === rowIndex) {
        let cellPos = rowPos + 1;

        for (
          let currentColumnIndex = 0;
          currentColumnIndex < rowNode.childCount;
          currentColumnIndex += 1
        ) {
          const cellNode = rowNode.child(currentColumnIndex);

          if (currentColumnIndex === columnIndex) {
            return Math.min(cellPos + 1, currentEditor.state.doc.content.size);
          }

          cellPos += cellNode.nodeSize;
        }
      }

      rowPos += rowNode.nodeSize;
    }

    return Math.min(tablePos + 3, currentEditor.state.doc.content.size);
  }

  function rebuildTable(
    tablePos: number,
    buildNextTable: (tableNode: NonNullable<ReturnType<typeof getTableNode>>) => NonNullable<ReturnType<typeof getTableNode>> | null,
  ) {
    if (!editor) {
      return;
    }

    const tableNode = getTableNode(tablePos);

    if (!tableNode) {
      setActionError("Failed to update table");
      setActionNotice(null);
      return;
    }

    const nextTable = buildNextTable(tableNode);

    if (!nextTable) {
      setActionError("Failed to update table");
      setActionNotice(null);
      return;
    }

    const tr = editor.state.tr.replaceWith(tablePos, tablePos + tableNode.nodeSize, nextTable);
    const selectionPos = Math.min(tablePos + 3, tr.doc.content.size);
    tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos)));
    editor.view.dispatch(tr);
    editor.view.focus();
    setActionError(null);
    setActionNotice("Table updated");
    setBlockMenu((current) => ({
      ...current,
      open: false,
      pos: null,
      showTurnInto: false,
    }));
    requestAnimationFrame(() => {
      syncHoveredBlockFromPos(tablePos);
      requestAnimationFrame(() => {
        syncHoveredBlockFromPos(tablePos);
      });
    });
  }

  function runTableCommandAtCell(
    tablePos: number,
    rowIndex: number,
    columnIndex: number,
    command: (currentEditor: Editor) => boolean,
  ) {
    if (!editor) {
      return;
    }

    const selectionPos = getTableCellSelectionPos(editor, tablePos, rowIndex, columnIndex);
    editor.chain().focus().setTextSelection(selectionPos).run();

    if (!command(editor)) {
      setActionError("Failed to update table");
      setActionNotice(null);
      return;
    }

    setActionError(null);
    setActionNotice("Table updated");
    setBlockMenu((current) => ({
      ...current,
      open: false,
      pos: null,
      showTurnInto: false,
    }));
    requestAnimationFrame(() => {
      syncHoveredBlockFromPos(tablePos);
      requestAnimationFrame(() => {
        syncHoveredBlockFromPos(tablePos);
      });
    });
  }

  return {
    canUndo,
    currentTransformActiveId,
    handleCopyImage,
    handleDeleteBlock: blockActions.handleDeleteBlock,
    handleDeleteTable: () => {
      updateTable((currentEditor) => currentEditor.chain().focus().deleteTable().run());
    },
    handleDeleteTableColumn: () => {
      updateTable((currentEditor) => currentEditor.chain().focus().deleteColumn().run());
    },
    handleDeleteTableRow: () => {
      updateTable((currentEditor) => currentEditor.chain().focus().deleteRow().run());
    },
    handleDownloadImage,
    handleDuplicateBlock: blockActions.handleDuplicateBlock,
    handleExportMarkdown: searchMarkdownActions.handleExportMarkdown,
    handleImportMarkdown: searchMarkdownActions.handleImportMarkdown,
    handleInsertImage,
    handleInsertBlockBefore: blockActions.handleInsertBlockBefore,
    handleInsertTableColumnLeft: () => {
      updateTable(
        (currentEditor) => currentEditor.chain().focus().addColumnBefore().run(),
        "left-edge",
      );
    },
    handleInsertTableColumn: () => {
      updateTable(
        (currentEditor) => currentEditor.chain().focus().addColumnAfter().run(),
        "right-edge",
      );
    },
    handleInsertTableRowAbove: () => {
      updateTable(
        (currentEditor) => currentEditor.chain().focus().addRowBefore().run(),
        "top-edge",
      );
    },
    handleInsertTableRow: () => {
      updateTable(
        (currentEditor) => currentEditor.chain().focus().addRowAfter().run(),
        "bottom-edge",
      );
    },
    handleTableColumnAction: (
      tablePos: number,
      columnIndex: number,
      action: "delete" | "duplicate" | "insert-left" | "insert-right",
    ) => {
      if (action === "insert-left") {
        runTableCommandAtCell(tablePos, 0, columnIndex, (currentEditor) =>
          currentEditor.chain().focus().addColumnBefore().run(),
        );
        return;
      }

      if (action === "insert-right") {
        runTableCommandAtCell(tablePos, 0, columnIndex, (currentEditor) =>
          currentEditor.chain().focus().addColumnAfter().run(),
        );
        return;
      }

      if (action === "delete") {
        runTableCommandAtCell(tablePos, 0, columnIndex, (currentEditor) =>
          currentEditor.chain().focus().deleteColumn().run(),
        );
        return;
      }

      rebuildTable(tablePos, (tableNode) => {
        const nextRows = [];

        for (let rowIndex = 0; rowIndex < tableNode.childCount; rowIndex += 1) {
          const rowNode = tableNode.child(rowIndex);
          const nextCells = [];

          for (let cellIndex = 0; cellIndex < rowNode.childCount; cellIndex += 1) {
            const cellNode = rowNode.child(cellIndex);
            nextCells.push(cellNode);

            if (cellIndex === columnIndex) {
              nextCells.push(cellNode.type.create(cellNode.attrs, cellNode.content));
            }
          }

          nextRows.push(rowNode.type.create(rowNode.attrs, nextCells));
        }

        return tableNode.type.create(tableNode.attrs, nextRows);
      });
    },
    handleTableRowAction: (
      tablePos: number,
      rowIndex: number,
      action: "delete" | "duplicate" | "insert-above" | "insert-below",
    ) => {
      if (action === "insert-above") {
        runTableCommandAtCell(tablePos, rowIndex, 0, (currentEditor) =>
          currentEditor.chain().focus().addRowBefore().run(),
        );
        return;
      }

      if (action === "insert-below") {
        runTableCommandAtCell(tablePos, rowIndex, 0, (currentEditor) =>
          currentEditor.chain().focus().addRowAfter().run(),
        );
        return;
      }

      if (action === "delete") {
        runTableCommandAtCell(tablePos, rowIndex, 0, (currentEditor) =>
          currentEditor.chain().focus().deleteRow().run(),
        );
        return;
      }

      rebuildTable(tablePos, (tableNode) => {
        const nextRows = [];

        for (let currentRowIndex = 0; currentRowIndex < tableNode.childCount; currentRowIndex += 1) {
          const rowNode = tableNode.child(currentRowIndex);
          nextRows.push(rowNode);

          if (currentRowIndex === rowIndex) {
            nextRows.push(rowNode.type.create(rowNode.attrs, rowNode.content));
          }
        }

        return tableNode.type.create(tableNode.attrs, nextRows);
      });
    },
    handleTableColumnMove: (tablePos: number, fromIndex: number, toIndex: number) => {
      rebuildTable(tablePos, (tableNode) => {
        if (fromIndex === toIndex || fromIndex + 1 === toIndex) {
          return tableNode;
        }

        const nextRows = [];

        for (let rowIndex = 0; rowIndex < tableNode.childCount; rowIndex += 1) {
          const rowNode = tableNode.child(rowIndex);
          const cells = Array.from({ length: rowNode.childCount }, (_, index) => rowNode.child(index));
          const [movedCell] = cells.splice(fromIndex, 1);

          if (!movedCell) {
            return tableNode;
          }

          const insertionIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
          cells.splice(insertionIndex, 0, movedCell);
          nextRows.push(rowNode.type.create(rowNode.attrs, cells));
        }

        return tableNode.type.create(tableNode.attrs, nextRows);
      });
    },
    handleTableRowMove: (tablePos: number, fromIndex: number, toIndex: number) => {
      rebuildTable(tablePos, (tableNode) => {
        if (fromIndex === toIndex || fromIndex + 1 === toIndex) {
          return tableNode;
        }

        const rows = Array.from({ length: tableNode.childCount }, (_, index) => tableNode.child(index));
        const [movedRow] = rows.splice(fromIndex, 1);

        if (!movedRow) {
          return tableNode;
        }

        const insertionIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
        rows.splice(insertionIndex, 0, movedRow);

        return tableNode.type.create(tableNode.attrs, rows);
      });
    },
    handleTurnInto: blockActions.handleTurnInto,
    isImageBlock,
    isTableBlock,
    runSearch: searchMarkdownActions.runSearch,
    statusLabel,
  };
}
