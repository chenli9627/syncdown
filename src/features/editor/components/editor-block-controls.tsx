"use client";

import { GripVertical, Plus } from "lucide-react";
import type { RefObject } from "react";
import type { HoveredBlock } from "@/features/editor/lib/types";

type EditorBlockControlsProps = {
  blockControlsRef: RefObject<HTMLDivElement | null>;
  blockMenuWidth: number;
  canEditBody: boolean;
  hoveredBlock: HoveredBlock | null;
  onInsertBlockBefore: () => void;
  onGripPointerDown: (
    event: React.PointerEvent<HTMLButtonElement>,
    hoveredBlock: HoveredBlock,
  ) => void;
  shouldSuppressGripClick: () => boolean;
  onOpenBlockMenu: (next: {
    left: number;
    open: boolean;
    pos: number | null;
    showTurnInto: boolean;
    turnIntoAlign: "bottom" | "top";
    top: number;
  }) => void;
};

export function EditorBlockControls({
  blockControlsRef,
  blockMenuWidth,
  canEditBody,
  hoveredBlock,
  onInsertBlockBefore,
  onGripPointerDown,
  onOpenBlockMenu,
  shouldSuppressGripClick,
}: EditorBlockControlsProps) {
  if (!canEditBody || !hoveredBlock) {
    return null;
  }

  return (
    <div
      className="absolute left-[-50px] z-10 flex items-center gap-1"
      ref={blockControlsRef}
      style={{
        top: `${Math.max(0, hoveredBlock.top + hoveredBlock.height / 2 - 14)}px`,
      }}
    >
      <button
        aria-label="Insert block"
        className="flex size-7 items-center justify-center rounded-[4px] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
        onClick={onInsertBlockBefore}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        title="Insert block"
        type="button"
      >
        <Plus className="size-4" />
      </button>
      <button
        aria-label="Block menu"
        className="flex size-7 items-center justify-center rounded-[4px] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onPointerDown={(event) => {
          onGripPointerDown(event, hoveredBlock);
        }}
        onClick={(event) => {
          if (shouldSuppressGripClick()) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          const triggerBounds = event.currentTarget.getBoundingClientRect();
          const menuHeight = 176;
          const nextLeft = Math.max(12, triggerBounds.left - blockMenuWidth - 2);
          const nextTop = Math.max(
            12,
            Math.min(triggerBounds.top - 8, window.innerHeight - menuHeight),
          );
          const turnIntoAlign =
            window.innerHeight - triggerBounds.top < 320 ? "bottom" : "top";

          onOpenBlockMenu({
            left: nextLeft,
            open: true,
            pos: hoveredBlock.pos,
            showTurnInto: false,
            turnIntoAlign,
            top: nextTop,
          });
        }}
        title="Block menu"
        type="button"
      >
        <GripVertical className="size-4" />
      </button>
    </div>
  );
}
