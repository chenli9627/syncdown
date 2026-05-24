"use client";

import { GripVertical, Plus } from "lucide-react";
import { useRef } from "react";
import type { RefObject } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import {
  CollaboratorAvatarStack,
  getCollaboratorAvatarStackWidth,
} from "@/features/editor/components/editor-collaborator-avatar-stack";
import type { HoveredBlock } from "@/features/editor/lib/types";

type EditorBlockControlsProps = {
  blockControlsRef: RefObject<HTMLDivElement | null>;
  blockMenu: {
    left: number;
    open: boolean;
    pos: number | null;
    showTurnInto: boolean;
    top: number;
    turnIntoAlign: "bottom" | "top";
  };
  blockMenuWidth: number;
  canEditBody: boolean;
  collaboratorAvatars: Array<{
    avatarUrl: string | null;
    color: string;
    name: string;
    userId: string;
  }>;
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
  blockMenu,
  blockMenuWidth,
  canEditBody,
  collaboratorAvatars,
  hoveredBlock,
  onInsertBlockBefore,
  onGripPointerDown,
  onOpenBlockMenu,
  shouldSuppressGripClick,
}: EditorBlockControlsProps) {
  const { t } = useLocale();
  const suppressNextMenuClickRef = useRef(false);

  if (!canEditBody || !hoveredBlock) {
    return null;
  }

  const avatarLaneWidth = getCollaboratorAvatarStackWidth(collaboratorAvatars.length);
  const gutterWidth = 80;
  const controlsOffsetFromEditorLeft = 48;

  return (
    <div
      className="absolute z-10 flex items-center gap-1"
      ref={blockControlsRef}
      style={{
        left: `${gutterWidth - controlsOffsetFromEditorLeft - avatarLaneWidth - (avatarLaneWidth > 0 ? 4 : 0)}px`,
        top: `${Math.max(0, hoveredBlock.top + hoveredBlock.height / 2 - 14)}px`,
      }}
    >
      <CollaboratorAvatarStack avatars={collaboratorAvatars} />
      <button
        aria-label={t("insertBlock")}
        className="flex size-7 items-center justify-center rounded-[4px] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
        onClick={onInsertBlockBefore}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        title={t("insertBlock")}
        type="button"
      >
        <Plus className="size-4" />
      </button>
      <button
        aria-label={t("blockMenu")}
        className="flex size-7 items-center justify-center rounded-[4px] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onPointerDown={(event) => {
          if (blockMenu.open && blockMenu.pos === hoveredBlock.pos) {
            event.preventDefault();
            event.stopPropagation();
            suppressNextMenuClickRef.current = true;
            onOpenBlockMenu({
              left: 0,
              open: false,
              pos: null,
              showTurnInto: false,
              top: 0,
              turnIntoAlign: "top",
            });
            return;
          }

          onGripPointerDown(event, hoveredBlock);
        }}
        onClick={(event) => {
          if (suppressNextMenuClickRef.current) {
            suppressNextMenuClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          if (shouldSuppressGripClick()) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          if (blockMenu.open && blockMenu.pos === hoveredBlock.pos) {
            onOpenBlockMenu({
              left: 0,
              open: false,
              pos: null,
              showTurnInto: false,
              top: 0,
              turnIntoAlign: "top",
            });
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
        title={t("blockMenu")}
        type="button"
      >
        <GripVertical className="size-4" />
      </button>
    </div>
  );
}
