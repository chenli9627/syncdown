"use client";

import { EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { EditorBlockControls } from "@/features/editor/components/editor-block-controls";
import { EditorBlockMenu } from "@/features/editor/components/editor-block-menu";
import { EditorSlashMenu } from "@/features/editor/components/editor-slash-menu";
import type {
  BlockTransformItem,
  HoveredBlock,
  SlashContext,
  SlashItem,
} from "@/features/editor/lib/types";
import type { SearchRect } from "@/features/editor/lib/search";

type BlockMenuState = {
  left: number;
  open: boolean;
  pos: number | null;
  showTurnInto: boolean;
  top: number;
};

type SlashMenuState = {
  activeIndex: number;
  left: number;
  open: boolean;
  placement: "above" | "below";
  query: string;
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
  handleDeleteBlock: () => void;
  handleDuplicateBlock: () => void;
  handleImportMarkdown: (file: File) => Promise<void>;
  handleInsertBlockBefore: () => void;
  handleTurnInto: (item: BlockTransformItem) => void;
  hoveredBlock: HoveredBlock | null;
  importInputRef: RefObject<HTMLInputElement | null>;
  searchRects: SearchRect[];
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
  handleDeleteBlock,
  handleDuplicateBlock,
  handleImportMarkdown,
  handleInsertBlockBefore,
  handleTurnInto,
  hoveredBlock,
  importInputRef,
  searchRects,
  setBlockMenu,
  setSlashMenu,
  slashContextState,
  slashMenu,
}: EditorCanvasProps) {
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
          hoveredBlock={hoveredBlock}
          onInsertBlockBefore={handleInsertBlockBefore}
          onOpenBlockMenu={setBlockMenu}
        />
        <EditorContent editor={editor} />
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
            setSlashMenu((current) => ({
              ...current,
              activeIndex: 0,
              open: false,
              query: "",
            }));
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
