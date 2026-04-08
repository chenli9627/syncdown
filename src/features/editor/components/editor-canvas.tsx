"use client";

import { EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { GripHorizontal, GripVertical, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { EditorBlockControls } from "@/features/editor/components/editor-block-controls";
import { EditorBlockMenu } from "@/features/editor/components/editor-block-menu";
import { EditorAiBubble } from "@/features/editor/components/editor-ai-bubble";
import { EditorSelectionBubble } from "@/features/editor/components/editor-selection-bubble";
import { EditorSlashMenu } from "@/features/editor/components/editor-slash-menu";
import { EditorTableAxisMenu } from "@/features/editor/components/editor-table-axis-menu";
import { useEditorBlockDrag } from "@/features/editor/hooks/use-editor-block-drag";
import type { AiActionKind } from "@/features/editor/lib/ai";
import {
  BLOCK_ELEMENT_SELECTOR,
  getBlockDropTargetFromPointer,
  getTopLevelBlockInfoFromElement,
} from "@/features/editor/lib/utils";
import type {
  AiBubbleState,
  BlockTransformItem,
  HoveredBlock,
  SelectionBubbleState,
  SlashContext,
  SlashItem,
  SlashMenuState,
} from "@/features/editor/lib/types";
import type { SearchRect } from "@/features/editor/lib/search";

type BlockMenuState = {
  left: number;
  open: boolean;
  pos: number | null;
  showTurnInto: boolean;
  turnIntoAlign: "bottom" | "top";
  top: number;
};

type TableAxisHandleState = {
  axis: "column" | "row";
  index: number;
  left: number;
  size: { height: number; width: number };
  tablePos: number;
  top: number;
};

type TableAxisMenuState = {
  axis: "column" | "row";
  index: number;
  left: number;
  open: boolean;
  rect: { height: number; left: number; top: number; width: number };
  tablePos: number;
  top: number;
};

type TableAxisDragState = {
  active: boolean;
  axis: "column" | "row";
  fromIndex: number;
  indicatorLeft: number | null;
  indicatorTop: number | null;
  moved: boolean;
  tablePos: number;
};

type EditorCanvasProps = {
  blockControlsRef: RefObject<HTMLDivElement | null>;
  blockMenu: BlockMenuState;
  blockMenuRef: RefObject<HTMLDivElement | null>;
  blockMenuWidth: number;
  blockTransformItems: BlockTransformItem[];
  canEditBody: boolean;
  currentTransformActiveId: string | null;
  editor: Editor | null;
  editorContainerRef: RefObject<HTMLDivElement | null>;
  enabledSlashItems: SlashItem[];
  filteredSlashItems: SlashItem[];
  handleCloseSlashMenu: () => void;
  handleCopyImage: () => Promise<void>;
  handleDeleteBlock: () => void;
  handleDeleteTable: () => void;
  handleDeleteTableColumn: () => void;
  handleDeleteTableRow: () => void;
  handleDownloadImage: () => Promise<void>;
  handleDuplicateBlock: () => void;
  handleImportMarkdown: (file: File) => Promise<void>;
  handleInsertImage: (file: File, position?: number) => Promise<void>;
  handleInsertBlockBefore: () => void;
  handleInsertTableColumnLeft: () => void;
  handleInsertTableColumn: () => void;
  handleInsertTableRowAbove: () => void;
  handleInsertTableRow: () => void;
  handleTableColumnMove: (tablePos: number, fromIndex: number, toIndex: number) => void;
  handleTableColumnAction: (
    tablePos: number,
    columnIndex: number,
    action: "delete" | "duplicate" | "insert-left" | "insert-right",
  ) => void;
  handleTableRowMove: (tablePos: number, fromIndex: number, toIndex: number) => void;
  handleTableRowAction: (
    tablePos: number,
    rowIndex: number,
    action: "delete" | "duplicate" | "insert-above" | "insert-below",
  ) => void;
  handleTurnInto: (item: BlockTransformItem) => void;
  hoveredBlock: HoveredBlock | null;
  imageInputRef: RefObject<HTMLInputElement | null>;
  importInputRef: RefObject<HTMLInputElement | null>;
  searchRects: SearchRect[];
  aiBubble: AiBubbleState;
  aiBubbleRef: RefObject<HTMLDivElement | null>;
  onAiApply: () => void;
  onAiClose: () => void;
  onAiInsertBelow: () => void;
  onAiPreviewAction: (action: AiActionKind) => void;
  onAiPromptChange: (value: string) => void;
  onFormatSelection: (command: "bold" | "italic" | "strike" | "code") => void;
  onOpenAiMenu: () => void;
  selectionBubble: SelectionBubbleState;
  selectionBubbleRef: RefObject<HTMLDivElement | null>;
  syncHoveredBlockFromPos: (position: number) => void;
  setBlockMenu: (
    value:
      | BlockMenuState
      | ((current: BlockMenuState) => BlockMenuState),
  ) => void;
  setSlashMenu: (
    value:
      | SlashMenuState
      | ((current: SlashMenuState) => SlashMenuState),
  ) => void;
  slashContextState: SlashContext | null;
  slashMenu: SlashMenuState;
};

export function EditorCanvas({
  blockControlsRef,
  blockMenu,
  blockMenuRef,
  blockMenuWidth,
  blockTransformItems,
  canEditBody,
  currentTransformActiveId,
  editor,
  editorContainerRef,
  enabledSlashItems,
  filteredSlashItems,
  handleCloseSlashMenu,
  handleCopyImage,
  handleDeleteBlock,
  handleDeleteTable,
  handleDeleteTableColumn,
  handleDeleteTableRow,
  handleDownloadImage,
  handleDuplicateBlock,
  handleImportMarkdown,
  handleInsertImage,
  handleInsertBlockBefore,
  handleInsertTableColumnLeft,
  handleInsertTableColumn,
  handleInsertTableRowAbove,
  handleInsertTableRow,
  handleTableColumnMove,
  handleTableColumnAction,
  handleTableRowMove,
  handleTableRowAction,
  handleTurnInto,
  hoveredBlock,
  imageInputRef,
  importInputRef,
  searchRects,
  aiBubble,
  aiBubbleRef,
  onAiApply,
  onAiClose,
  onAiInsertBelow,
  onAiPreviewAction,
  onAiPromptChange,
  onFormatSelection,
  onOpenAiMenu,
  selectionBubble,
  selectionBubbleRef,
  syncHoveredBlockFromPos,
  setBlockMenu,
  setSlashMenu,
  slashContextState,
  slashMenu,
}: EditorCanvasProps) {
  const activeBlockHighlightRef = useRef<HTMLSpanElement | null>(null);
  const tableAxisMenuRef = useRef<HTMLDivElement | null>(null);
  const suppressNextTableHandleClickRef = useRef(false);
  const [imageDropIndicatorTop, setImageDropIndicatorTop] = useState<number | null>(null);
  const [tableAxisMenu, setTableAxisMenu] = useState<TableAxisMenuState | null>(null);
  const [tableColumnHandle, setTableColumnHandle] = useState<TableAxisHandleState | null>(null);
  const [tableRowHandle, setTableRowHandle] = useState<TableAxisHandleState | null>(null);
  const [tableAxisDrag, setTableAxisDrag] = useState<TableAxisDragState | null>(null);
  const drag = useEditorBlockDrag({
    canEditBody,
    editor,
    editorContainerRef,
    setBlockMenu: (value) => {
      setBlockMenu(value);
    },
    syncHoveredBlockFromPos,
  });

  useEffect(() => {
    const highlight = activeBlockHighlightRef.current;

    if (!highlight) {
      return;
    }

    if (!editor || !blockMenu.open || blockMenu.pos == null) {
      highlight.style.opacity = "0";
      return;
    }

    const container = editorContainerRef.current;
    const domNode = editor.view.nodeDOM(blockMenu.pos);
    const blockElement =
      (domNode instanceof HTMLElement ? domNode : domNode?.parentElement)?.closest(
        BLOCK_ELEMENT_SELECTOR,
      ) ?? null;

    if (!(container instanceof HTMLElement) || !(blockElement instanceof HTMLElement)) {
      highlight.style.opacity = "0";
      return;
    }

    const blockBounds = blockElement.getBoundingClientRect();
    const containerBounds = container.getBoundingClientRect();

    highlight.style.height = `${blockBounds.height}px`;
    highlight.style.top = `${blockBounds.top - containerBounds.top}px`;
    highlight.style.opacity = "1";
  }, [blockMenu.open, blockMenu.pos, editor, editorContainerRef]);

  const hoveredBlockType =
    editor && hoveredBlock ? editor.state.doc.nodeAt(hoveredBlock.pos)?.type.name ?? null : null;
  const tableOverlay =
    canEditBody && hoveredBlock && hoveredBlockType === "table"
      ? {
          bottom: hoveredBlock.top + hoveredBlock.height,
          height: hoveredBlock.height,
          left: hoveredBlock.left,
          right: hoveredBlock.left + hoveredBlock.width,
          top: hoveredBlock.top,
          width: hoveredBlock.width,
        }
      : null;
  const tableOverlayHeight = tableOverlay?.height ?? 0;
  const tableOverlayLeft = tableOverlay?.left ?? 0;
  const tableOverlayTop = tableOverlay?.top ?? 0;
  const tableOverlayWidth = tableOverlay?.width ?? 0;

  useEffect(() => {
    if (!tableAxisDrag?.active || !editor) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const domNode = editor.view.nodeDOM(tableAxisDrag.tablePos);
      const tableElement =
        (domNode instanceof HTMLElement ? domNode : domNode?.parentElement)?.closest("table") ?? null;
      const container = editorContainerRef.current;

      if (!(tableElement instanceof HTMLTableElement) || !(container instanceof HTMLElement)) {
        return;
      }

      const containerBounds = container.getBoundingClientRect();

      if (tableAxisDrag.axis === "row") {
        const rows = Array.from(tableElement.rows);
        let dropIndex = rows.length;
        let indicatorTop = tableElement.getBoundingClientRect().bottom - containerBounds.top;

        for (let index = 0; index < rows.length; index += 1) {
          const bounds = rows[index].getBoundingClientRect();
          const midpoint = bounds.top + bounds.height / 2;

          if (event.clientY < midpoint) {
            dropIndex = index;
            indicatorTop = bounds.top - containerBounds.top;
            break;
          }
        }

        setTableAxisDrag((current) =>
          current
            ? {
                ...current,
                indicatorLeft: tableElement.getBoundingClientRect().left - containerBounds.left,
                indicatorTop,
                moved: true,
              }
            : current,
        );
        (handlePointerMove as unknown as { dropIndex?: number }).dropIndex = dropIndex;
        return;
      }

      const firstRow = tableElement.rows.item(0);
      const cells = firstRow ? Array.from(firstRow.cells) : [];
      let dropIndex = cells.length;
      let indicatorLeft = tableElement.getBoundingClientRect().right - containerBounds.left;

      for (let index = 0; index < cells.length; index += 1) {
        const bounds = cells[index].getBoundingClientRect();
        const midpoint = bounds.left + bounds.width / 2;

        if (event.clientX < midpoint) {
          dropIndex = index;
          indicatorLeft = bounds.left - containerBounds.left;
          break;
        }
      }

      setTableAxisDrag((current) =>
        current
          ? {
              ...current,
              indicatorLeft,
              indicatorTop: tableElement.getBoundingClientRect().top - containerBounds.top,
              moved: true,
            }
          : current,
      );
      (handlePointerMove as unknown as { dropIndex?: number }).dropIndex = dropIndex;
    };

    const handlePointerUp = () => {
      const dropIndex = (handlePointerMove as unknown as { dropIndex?: number }).dropIndex;

      if (typeof dropIndex === "number") {
        suppressNextTableHandleClickRef.current = true;
        if (tableAxisDrag.axis === "row") {
          handleTableRowMove(tableAxisDrag.tablePos, tableAxisDrag.fromIndex, dropIndex);
        } else {
          handleTableColumnMove(tableAxisDrag.tablePos, tableAxisDrag.fromIndex, dropIndex);
        }
      } else if (!tableAxisDrag.moved) {
        const handleState =
          tableAxisDrag.axis === "row" ? tableRowHandle : tableColumnHandle;

        if (handleState) {
          setTableAxisMenu({
            axis: tableAxisDrag.axis,
            index: tableAxisDrag.fromIndex,
            left:
              tableAxisDrag.axis === "row"
                ? Math.max(12, handleState.left + 18)
                : Math.max(12, handleState.left + 12),
            open: true,
            rect:
              tableAxisDrag.axis === "row"
                ? {
                    height: handleState.size.height,
                    left: tableOverlayLeft,
                    top: handleState.top + 10 - handleState.size.height / 2,
                    width: tableOverlayWidth,
                  }
                : {
                    height: tableOverlayHeight,
                    left: handleState.left + 10 - handleState.size.width / 2,
                    top: tableOverlayTop,
                    width: handleState.size.width,
                  },
            tablePos: tableAxisDrag.tablePos,
            top:
              tableAxisDrag.axis === "row"
                ? Math.max(12, handleState.top - 6)
                : Math.max(12, handleState.top + 18),
          });
        }
      }

      setTableAxisDrag(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    editor,
    editorContainerRef,
    handleTableColumnMove,
    handleTableRowMove,
    tableOverlayHeight,
    tableOverlayLeft,
    tableOverlayTop,
    tableOverlayWidth,
    tableAxisDrag,
    tableColumnHandle,
    tableRowHandle,
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-10 py-8">
      <input
        accept=".md,.zip,text/markdown,application/zip"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (!file) {
            return;
          }

          void handleImportMarkdown(file);
          event.currentTarget.value = "";
        }}
        ref={importInputRef}
        type="file"
      />
      <input
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (!file) {
            return;
          }

          void handleInsertImage(file);
          event.currentTarget.value = "";
        }}
        ref={imageInputRef}
        type="file"
      />
      <div
        className="relative"
        onContextMenu={(event) => {
          if (!canEditBody || !editor) {
            return;
          }

          const image = (event.target instanceof HTMLElement
            ? event.target.closest("img")
            : null) as HTMLImageElement | null;

          if (!image) {
            return;
          }

          const container = editorContainerRef.current;

          if (!(container instanceof HTMLElement)) {
            return;
          }

          const blockInfo = getTopLevelBlockInfoFromElement(editor, image, container);

          if (!blockInfo) {
            return;
          }

          event.preventDefault();

          const menuHeight = 176;
          const nextLeft = Math.max(12, event.clientX - blockMenuWidth - 2);
          const nextTop = Math.max(
            12,
            Math.min(event.clientY - 8, window.innerHeight - menuHeight),
          );
          const turnIntoAlign =
            window.innerHeight - event.clientY < 320 ? "bottom" : "top";

          setBlockMenu({
            left: nextLeft,
            open: true,
            pos: blockInfo.pos,
            showTurnInto: false,
            turnIntoAlign,
            top: nextTop,
          });
        }}
        onPointerMove={(event) => {
          if (!canEditBody || !editor) {
            setTableColumnHandle(null);
            setTableRowHandle(null);
            return;
          }

          const target = event.target;

          if (
            target instanceof Node &&
            (tableAxisMenuRef.current?.contains(target) ||
              (target instanceof HTMLElement &&
                (target.closest("[data-table-row-handle]") || target.closest("[data-table-column-handle]"))))
          ) {
            return;
          }

          const cell = target instanceof HTMLElement ? target.closest("td, th") : null;
          const table = cell?.closest("table");
          const row = cell?.closest("tr");
          const container = editorContainerRef.current;

          if (
            !(cell instanceof HTMLTableCellElement) ||
            !(table instanceof HTMLTableElement) ||
            !(row instanceof HTMLTableRowElement) ||
            !(container instanceof HTMLElement)
          ) {
            if (!tableAxisMenu?.open) {
              setTableColumnHandle(null);
              setTableRowHandle(null);
            }
            return;
          }

          const tableInfo = getTopLevelBlockInfoFromElement(editor, table, container);

          if (!tableInfo) {
            return;
          }

          const containerBounds = container.getBoundingClientRect();
          const rowBounds = row.getBoundingClientRect();
          const cellBounds = cell.getBoundingClientRect();
          const rowIndex = Array.from(table.rows).indexOf(row);
          const columnIndex = Array.from(row.cells).indexOf(cell);
          const nearLeftEdge = event.clientX - cellBounds.left <= 18;
          const nearTopEdge = event.clientY - cellBounds.top <= 18;

          setTableRowHandle(
            nearLeftEdge
              ? {
                  axis: "row",
                  index: rowIndex,
                  left: cellBounds.left - containerBounds.left - 8,
                  size: { height: rowBounds.height, width: 16 },
                  tablePos: tableInfo.pos,
                  top: rowBounds.top - containerBounds.top + rowBounds.height / 2 - 10,
                }
              : null,
          );
          setTableColumnHandle(
            nearTopEdge
              ? {
                  axis: "column",
                  index: columnIndex,
                  left: cellBounds.left - containerBounds.left + cellBounds.width / 2 - 10,
                  size: { height: 16, width: cellBounds.width },
                  tablePos: tableInfo.pos,
                  top: cellBounds.top - containerBounds.top - 8,
                }
              : null,
          );
        }}
        onPointerLeave={(event) => {
          const nextTarget = event.relatedTarget;

          if (
            nextTarget instanceof Node &&
            (tableAxisMenuRef.current?.contains(nextTarget) ||
              (nextTarget instanceof HTMLElement &&
                (nextTarget.closest("[data-table-row-handle]") ||
                  nextTarget.closest("[data-table-column-handle]"))))
          ) {
            return;
          }

          if (!tableAxisMenu?.open) {
            setTableColumnHandle(null);
            setTableRowHandle(null);
          }
        }}
        onDragLeave={(event) => {
          const nextTarget = event.relatedTarget;

          if (
            editorContainerRef.current instanceof HTMLElement &&
            nextTarget instanceof Node &&
            editorContainerRef.current.contains(nextTarget)
          ) {
            return;
          }

          setImageDropIndicatorTop(null);
        }}
        onDragOver={(event) => {
          if (!canEditBody || !editor) {
            return;
          }

          const hasImageFile = Array.from(event.dataTransfer?.items ?? []).some(
            (item) => item.kind === "file" && item.type.startsWith("image/"),
          );

          if (!hasImageFile) {
            setImageDropIndicatorTop(null);
            return;
          }

          event.preventDefault();

          const container = editorContainerRef.current;
          const editorRoot = container?.querySelector(".ProseMirror");

          if (!(container instanceof HTMLElement) || !(editorRoot instanceof HTMLElement)) {
            return;
          }

          const target = getBlockDropTargetFromPointer(
            editor,
            editorRoot,
            container,
            event.clientY,
            null,
          );

          setImageDropIndicatorTop(
            target?.indicatorTop ?? editorRoot.getBoundingClientRect().bottom - container.getBoundingClientRect().top,
          );
        }}
        onDrop={(event) => {
          if (!canEditBody || !editor) {
            return;
          }

          const file = Array.from(event.dataTransfer?.files ?? []).find((item) =>
            item.type.startsWith("image/"),
          );

          if (!file) {
            setImageDropIndicatorTop(null);
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          const container = editorContainerRef.current;
          const editorRoot = container?.querySelector(".ProseMirror");
          const target =
            container instanceof HTMLElement && editorRoot instanceof HTMLElement
              ? getBlockDropTargetFromPointer(
                  editor,
                  editorRoot,
                  container,
                  event.clientY,
                  null,
                )
              : null;

          setImageDropIndicatorTop(null);
          void handleInsertImage(file, target?.dropPos ?? editor.state.doc.content.size);
        }}
        ref={editorContainerRef}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 z-0 bg-[#dbe9f8] opacity-0"
          ref={activeBlockHighlightRef}
        />
        {imageDropIndicatorTop != null ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 z-[3] h-[2px] bg-[var(--color-primary)]"
            style={{
              top: `${imageDropIndicatorTop}px`,
            }}
          />
        ) : null}
        {drag.dragState.active && drag.dragState.indicatorTop != null ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 z-[3] h-[2px] bg-[var(--color-primary)]"
            style={{
              top: `${drag.dragState.indicatorTop}px`,
            }}
          />
        ) : null}
        {tableAxisDrag?.active &&
        tableAxisDrag.indicatorTop != null &&
        tableAxisDrag.axis === "row" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute z-[4] h-[2px] bg-[var(--color-primary)]"
            style={{
              left: `${tableAxisDrag.indicatorLeft ?? 0}px`,
              top: `${tableAxisDrag.indicatorTop}px`,
              width: `${tableOverlay?.width ?? 0}px`,
            }}
          />
        ) : null}
        {tableAxisDrag?.active &&
        tableAxisDrag.indicatorLeft != null &&
        tableAxisDrag.axis === "column" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute z-[4] w-[2px] bg-[var(--color-primary)]"
            style={{
              height: `${tableOverlay?.height ?? 0}px`,
              left: `${tableAxisDrag.indicatorLeft}px`,
              top: `${tableAxisDrag.indicatorTop ?? 0}px`,
            }}
          />
        ) : null}
        {drag.dragState.active &&
        drag.dragState.previewTop != null &&
        drag.dragState.previewHtml != null &&
        drag.dragState.previewLeft != null &&
        drag.dragState.previewScale != null &&
        drag.dragState.previewWidth != null &&
        drag.dragState.previewHeight != null &&
        globalThis.document?.body
          ? createPortal(
              <div
                aria-hidden="true"
                className="pointer-events-none fixed z-[95] overflow-visible bg-transparent opacity-55"
                style={{
                  height: `${drag.dragState.previewHeight * drag.dragState.previewScale}px`,
                  left: `${drag.dragState.previewLeft}px`,
                  top: `${drag.dragState.previewTop}px`,
                  width: `${drag.dragState.previewWidth * drag.dragState.previewScale}px`,
                }}
              >
                <div
                  className="syntext-editor prose-mirror-drag-preview px-0"
                  dangerouslySetInnerHTML={{ __html: drag.dragState.previewHtml }}
                  style={{
                    height: `${drag.dragState.previewHeight}px`,
                    transform: `scale(${drag.dragState.previewScale})`,
                    transformOrigin: "top left",
                    width: `${drag.dragState.previewWidth}px`,
                  }}
                />
              </div>,
              globalThis.document.body,
            )
          : null}
        {searchRects.map((rect, index) => (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute z-[1] bg-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
            key={`${rect.left}-${rect.top}-${index}`}
            style={{
              height: `${rect.height}px`,
              left: `${rect.left}px`,
              top: `${rect.top}px`,
              width: `${rect.width}px`,
            }}
          />
        ))}
        {tableAxisMenu?.open ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute z-[3] border-2 border-[var(--color-primary)]"
            style={{
              height: `${tableAxisMenu.rect.height}px`,
              left: `${tableAxisMenu.rect.left}px`,
              top: `${tableAxisMenu.rect.top}px`,
              width: `${tableAxisMenu.rect.width}px`,
            }}
          />
        ) : null}
        <EditorBlockControls
          blockControlsRef={blockControlsRef}
          blockMenuWidth={blockMenuWidth}
          canEditBody={canEditBody}
          hoveredBlock={slashMenu.open || drag.dragState.active ? null : hoveredBlock}
          onInsertBlockBefore={handleInsertBlockBefore}
          onGripPointerDown={drag.handleGripPointerDown}
          onOpenBlockMenu={setBlockMenu}
          shouldSuppressGripClick={drag.shouldSuppressGripClick}
        />
        <div className="relative z-[2]">
          <EditorContent editor={editor} />
        </div>
        <EditorSelectionBubble
          editor={editor}
          onFormat={onFormatSelection}
          onOpenAi={onOpenAiMenu}
          selectionBubble={selectionBubble}
          selectionBubbleRef={selectionBubbleRef}
        />
        <EditorAiBubble
          aiBubble={aiBubble}
          aiBubbleRef={aiBubbleRef}
          onApply={onAiApply}
          onClose={onAiClose}
          onInsertBelow={onAiInsertBelow}
          onPreviewAction={onAiPreviewAction}
          onPromptChange={onAiPromptChange}
        />
        {canEditBody && blockMenu.open && globalThis.document?.body
          ? createPortal(
              <EditorBlockMenu
                blockMenuLeft={blockMenu.left}
                blockMenuOpen={blockMenu.open}
                blockMenuRef={blockMenuRef}
                blockMenuTop={blockMenu.top}
                blockTransformItems={blockTransformItems}
                canEditBody={canEditBody}
                currentTransformActiveId={currentTransformActiveId}
                handleCopyImage={() => {
                  void handleCopyImage();
                }}
                handleDeleteBlock={handleDeleteBlock}
                handleDeleteTable={handleDeleteTable}
                handleDeleteTableColumn={handleDeleteTableColumn}
                handleDeleteTableRow={handleDeleteTableRow}
                handleDownloadImage={() => {
                  void handleDownloadImage();
                }}
                handleDuplicateBlock={handleDuplicateBlock}
                handleInsertTableColumnLeft={handleInsertTableColumnLeft}
                handleInsertTableColumn={handleInsertTableColumn}
                handleInsertTableRowAbove={handleInsertTableRowAbove}
                handleInsertTableRow={handleInsertTableRow}
                handleTurnInto={handleTurnInto}
                isImageBlock={currentTransformActiveId === "image"}
                isTableBlock={currentTransformActiveId === "table"}
                setBlockMenu={setBlockMenu}
                showTurnInto={blockMenu.showTurnInto}
                turnIntoAlign={blockMenu.turnIntoAlign}
              />,
              globalThis.document.body,
            )
          : null}
        {canEditBody && tableOverlay ? (
          <>
            <button
              aria-label="Add table column"
              className="absolute z-20 flex size-7 items-center justify-center rounded-[4px] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
              onClick={handleInsertTableColumn}
              style={{
                left: `${tableOverlay.right - 12}px`,
                top: `${Math.max(0, tableOverlay.top + tableOverlay.height / 2 - 14)}px`,
              }}
              title="Add column"
              type="button"
            >
              <Plus className="size-4" />
            </button>
            <button
              aria-label="Add table row"
              className="absolute z-20 flex size-7 items-center justify-center rounded-[4px] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
              onClick={handleInsertTableRow}
              style={{
                left: `${Math.max(0, tableOverlay.left + tableOverlay.width / 2 - 14)}px`,
                top: `${tableOverlay.bottom - 12}px`,
              }}
              title="Add row"
              type="button"
            >
              <Plus className="size-4" />
            </button>
          </>
        ) : null}
        {canEditBody && tableRowHandle ? (
          <button
            aria-label="Row actions"
            className="absolute z-20 flex h-[18px] w-[16px] items-center justify-center rounded-[4px] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
            data-table-row-handle="true"
            onClick={() => {
              if (suppressNextTableHandleClickRef.current) {
                suppressNextTableHandleClickRef.current = false;
                return;
              }

              setTableAxisMenu({
                axis: "row",
                index: tableRowHandle.index,
                left: Math.max(12, tableRowHandle.left + 24),
                open: true,
                rect: {
                  height: tableRowHandle.size.height,
                  left: tableOverlayLeft,
                  top: tableRowHandle.top + 10 - tableRowHandle.size.height / 2,
                  width: tableOverlayWidth,
                },
                tablePos: tableRowHandle.tablePos,
                top: Math.max(12, tableRowHandle.top - 10),
              });
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              setTableAxisMenu(null);
              setTableAxisDrag({
                active: true,
                axis: "row",
                fromIndex: tableRowHandle.index,
                indicatorLeft: tableOverlay?.left ?? null,
                indicatorTop: tableRowHandle.top,
                moved: false,
                tablePos: tableRowHandle.tablePos,
              });
            }}
            style={{
              left: `${tableRowHandle.left}px`,
              top: `${tableRowHandle.top}px`,
            }}
            title="Row actions"
            type="button"
          >
            <GripHorizontal className="size-3.5" />
          </button>
        ) : null}
        {canEditBody && tableColumnHandle ? (
          <button
            aria-label="Column actions"
            className="absolute z-20 flex h-[16px] w-[18px] items-center justify-center rounded-[4px] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
            data-table-column-handle="true"
            onClick={() => {
              if (suppressNextTableHandleClickRef.current) {
                suppressNextTableHandleClickRef.current = false;
                return;
              }

              setTableAxisMenu({
                axis: "column",
                index: tableColumnHandle.index,
                left: Math.max(12, tableColumnHandle.left - 18),
                open: true,
                rect: {
                  height: tableOverlayHeight,
                  left: tableColumnHandle.left + 10 - tableColumnHandle.size.width / 2,
                  top: tableOverlayTop,
                  width: tableColumnHandle.size.width,
                },
                tablePos: tableColumnHandle.tablePos,
                top: Math.max(12, tableColumnHandle.top + 24),
              });
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              setTableAxisMenu(null);
              setTableAxisDrag({
                active: true,
                axis: "column",
                fromIndex: tableColumnHandle.index,
                indicatorLeft: tableColumnHandle.left,
                indicatorTop: tableOverlay?.top ?? null,
                moved: false,
                tablePos: tableColumnHandle.tablePos,
              });
            }}
            style={{
              left: `${tableColumnHandle.left}px`,
              top: `${tableColumnHandle.top}px`,
            }}
            title="Column actions"
            type="button"
          >
            <GripVertical className="size-3.5" />
          </button>
        ) : null}
        {canEditBody && tableAxisMenu?.open && globalThis.document?.body
          ? createPortal(
              <div ref={tableAxisMenuRef}>
                <EditorTableAxisMenu
                  axis={tableAxisMenu.axis}
                  left={tableAxisMenu.left}
                  onAction={(action) => {
                    if (tableAxisMenu.axis === "row") {
                      handleTableRowAction(
                        tableAxisMenu.tablePos,
                        tableAxisMenu.index,
                        action as "delete" | "duplicate" | "insert-above" | "insert-below",
                      );
                    } else {
                      handleTableColumnAction(
                        tableAxisMenu.tablePos,
                        tableAxisMenu.index,
                        action as "delete" | "duplicate" | "insert-left" | "insert-right",
                      );
                    }
                    setTableAxisMenu(null);
                  }}
                  top={tableAxisMenu.top}
                />
              </div>,
              globalThis.document.body,
            )
          : null}
        <EditorSlashMenu
          activeIndex={slashMenu.activeIndex}
          editor={editor}
          enabledItems={enabledSlashItems}
          filteredItems={filteredSlashItems}
          onActivateItem={(nextIndex) => {
            setSlashMenu((current) => ({
              ...current,
              activeIndex: nextIndex,
            }));
          }}
          onClose={() => {
            handleCloseSlashMenu();
          }}
          open={canEditBody && slashMenu.open}
          position={{
            left: slashMenu.left,
            top: slashMenu.top,
          }}
          slashContext={slashContextState}
        />
      </div>
    </div>
  );
}
