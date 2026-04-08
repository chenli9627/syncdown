"use client";

import { EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { EditorBlockControls } from "@/features/editor/components/editor-block-controls";
import { EditorBlockMenu } from "@/features/editor/components/editor-block-menu";
import { EditorAiBubble } from "@/features/editor/components/editor-ai-bubble";
import { EditorSelectionBubble } from "@/features/editor/components/editor-selection-bubble";
import { EditorSlashMenu } from "@/features/editor/components/editor-slash-menu";
import { useEditorBlockDrag } from "@/features/editor/hooks/use-editor-block-drag";
import type { AiActionKind } from "@/features/editor/lib/ai";
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
  handleDeleteBlock: () => void;
  handleDuplicateBlock: () => void;
  handleImportMarkdown: (file: File) => Promise<void>;
  handleInsertBlockBefore: () => void;
  handleTurnInto: (item: BlockTransformItem) => void;
  hoveredBlock: HoveredBlock | null;
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
  handleDeleteBlock,
  handleDuplicateBlock,
  handleImportMarkdown,
  handleInsertBlockBefore,
  handleTurnInto,
  hoveredBlock,
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
        "p, h1, h2, h3, h4, blockquote, pre, li, hr",
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-10 py-8">
      <input
        accept=".md,text/markdown"
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
      <div className="relative" ref={editorContainerRef}>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 z-0 bg-[#dbe9f8] opacity-0"
          ref={activeBlockHighlightRef}
        />
        {drag.dragState.active && drag.dragState.indicatorTop != null ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 z-[3] h-[2px] bg-[var(--color-primary)]"
            style={{
              top: `${drag.dragState.indicatorTop}px`,
            }}
          />
        ) : null}
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
                handleDeleteBlock={handleDeleteBlock}
                handleDuplicateBlock={handleDuplicateBlock}
                handleTurnInto={handleTurnInto}
                setBlockMenu={setBlockMenu}
                showTurnInto={blockMenu.showTurnInto}
                turnIntoAlign={blockMenu.turnIntoAlign}
              />,
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
