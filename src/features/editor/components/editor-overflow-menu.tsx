"use client";

import { Download, ImagePlus, MoreHorizontal, Trash2, Undo2, Upload } from "lucide-react";
import type { RefObject } from "react";

type EditorOverflowMenuProps = {
  actionError: string | null;
  actionNotice: string | null;
  canEditBody: boolean;
  canUndo: boolean;
  onExport: () => void;
  onInsertImage: () => void;
  onImport: () => void;
  onMoveToTrash: () => void;
  onOpenChange: (next: boolean | ((current: boolean) => boolean)) => void;
  onResetMessages: () => void;
  onUndo: () => void;
  overflowButtonRef: RefObject<HTMLButtonElement | null>;
  overflowMenuOpen: boolean;
  overflowMenuRef: RefObject<HTMLDivElement | null>;
  permission: "owner" | "can_edit" | "can_view";
};

export function EditorOverflowMenu({
  actionError,
  actionNotice,
  canEditBody,
  canUndo,
  onExport,
  onInsertImage,
  onImport,
  onMoveToTrash,
  onOpenChange,
  onResetMessages,
  onUndo,
  overflowButtonRef,
  overflowMenuOpen,
  overflowMenuRef,
  permission,
}: EditorOverflowMenuProps) {
  return (
    <div className="relative">
      <button
        className="flex size-9 items-center justify-center border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-hover)]"
        onClick={() => {
          onOpenChange((current) => !current);
          onResetMessages();
        }}
        ref={overflowButtonRef}
        title="Actions"
        type="button"
      >
        <MoreHorizontal className="size-3.5 text-[var(--color-muted-foreground)]" />
      </button>

      {overflowMenuOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+10px)] z-20 w-[280px] overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft-card)]"
          ref={overflowMenuRef}
        >
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <p className="text-[15px] font-semibold text-[var(--color-foreground)]">
              Actions
            </p>
          </div>
          <div className="space-y-2 px-4 py-4">
            <button
              className="flex w-full items-center border border-transparent py-2 pl-2 pr-0.5 text-left text-sm transition hover:bg-[var(--color-hover)] disabled:opacity-40"
              disabled={!canEditBody || !canUndo}
              onClick={onUndo}
              type="button"
            >
              <span>Undo</span>
              <Undo2 className="ml-auto size-4 text-[var(--color-muted-foreground)]" />
            </button>
            <button
              className="flex w-full items-center border border-transparent py-2 pl-2 pr-0.5 text-left text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] disabled:opacity-40"
              disabled={!canEditBody}
              onClick={onInsertImage}
              type="button"
            >
              <span>Upload image</span>
              <ImagePlus className="ml-auto size-4" />
            </button>
            <button
              className="flex w-full items-center border border-transparent py-2 pl-2 pr-0.5 text-left text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] disabled:opacity-40"
              disabled={!canEditBody}
              onClick={onImport}
              type="button"
            >
              <span>Import .md / .zip</span>
              <Upload className="ml-auto size-4" />
            </button>
            <button
              className="flex w-full items-center border border-transparent py-2 pl-2 pr-0.5 text-left text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)]"
              onClick={onExport}
              type="button"
            >
              <span>Export</span>
              <Download className="ml-auto size-4" />
            </button>
            {permission === "owner" ? (
              <button
                className="flex w-full items-center border border-transparent py-2 pl-2 pr-0.5 text-left text-sm text-[#b44c07] transition hover:bg-[var(--color-hover)]"
                onClick={onMoveToTrash}
                type="button"
              >
                <span>Move to Trash</span>
                <Trash2 className="ml-auto size-4" />
              </button>
            ) : null}
            {actionError ? (
              <p className="px-2 pt-1 text-sm text-[#dd5b00]">{actionError}</p>
            ) : null}
            {actionNotice ? (
              <p className="px-2 pt-1 text-sm text-[var(--color-muted-foreground)]">
                {actionNotice}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
