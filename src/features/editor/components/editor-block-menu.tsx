"use client";

import { ChevronRight, Copy, Sparkles, Trash2 } from "lucide-react";
import type { RefObject } from "react";
import type { BlockTransformItem } from "@/features/editor/lib/types";

type EditorBlockMenuProps = {
  blockMenuLeft: number;
  blockMenuOpen: boolean;
  blockMenuRef: RefObject<HTMLDivElement | null>;
  blockMenuTop: number;
  blockTransformItems: BlockTransformItem[];
  canEditBody: boolean;
  currentTransformActiveId: string | null;
  handleDeleteBlock: () => void;
  handleDuplicateBlock: () => void;
  handleTurnInto: (item: BlockTransformItem) => void;
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
  showTurnInto: boolean;
};

export function EditorBlockMenu({
  blockMenuLeft,
  blockMenuOpen,
  blockMenuRef,
  blockMenuTop,
  blockTransformItems,
  canEditBody,
  currentTransformActiveId,
  handleDeleteBlock,
  handleDuplicateBlock,
  handleTurnInto,
  setBlockMenu,
  showTurnInto,
}: EditorBlockMenuProps) {
  if (!canEditBody || !blockMenuOpen || !globalThis.document?.body) {
    return null;
  }

  return (
    <div
      className="fixed z-[90] w-[208px] border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-soft-card)]"
      ref={blockMenuRef}
      style={{
        left: `${blockMenuLeft}px`,
        top: `${blockMenuTop}px`,
      }}
    >
      <div
        className="relative"
        onMouseEnter={() => {
          setBlockMenu((current) => ({
            ...current,
            showTurnInto: true,
          }));
        }}
        onMouseLeave={() => {
          setBlockMenu((current) => ({
            ...current,
            showTurnInto: false,
          }));
        }}
      >
        <button
          className="flex w-full items-center justify-between gap-3 px-2.5 py-2 text-left text-[13px] text-[var(--color-foreground)] transition hover:bg-[var(--color-hover)]"
          type="button"
        >
          <span>Turn into</span>
          <ChevronRight
            className={`size-4 text-[var(--color-muted-foreground)] transition ${
              showTurnInto ? "translate-x-0.5" : ""
            }`}
          />
        </button>
        {showTurnInto ? (
          <div className="absolute left-full top-0 z-[91] w-[208px] border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-soft-card)]">
            {blockTransformItems.map((item) => {
              const isCurrent = currentTransformActiveId === item.id;

              return (
                <button
                  className={`flex w-full items-center justify-between gap-3 px-2.5 py-2 text-left text-[13px] transition ${
                    isCurrent
                      ? "bg-[var(--color-hover)] text-[var(--color-foreground)]"
                      : "text-[var(--color-foreground)] hover:bg-[var(--color-hover)]"
                  }`}
                  key={item.id}
                  onClick={() => {
                    handleTurnInto(item);
                  }}
                  type="button"
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {isCurrent ? "Current" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <button
        className="flex w-full items-center justify-between gap-3 px-2.5 py-2 text-left text-[13px] text-[var(--color-foreground)] transition hover:bg-[var(--color-hover)]"
        onClick={handleDuplicateBlock}
        type="button"
      >
        <span>Duplicate</span>
        <Copy className="size-4 text-[var(--color-muted-foreground)]" />
      </button>
      <button
        className="flex w-full items-center justify-between gap-3 px-2.5 py-2 text-left text-[13px] text-[var(--color-foreground)] transition hover:bg-[var(--color-hover)]"
        disabled
        type="button"
      >
        <span>AI actions</span>
        <Sparkles className="size-4 text-[var(--color-muted-foreground)]" />
      </button>
      <button
        className="flex w-full items-center justify-between gap-3 px-2.5 py-2 text-left text-[13px] text-[#b44c07] transition hover:bg-[var(--color-hover)]"
        onClick={handleDeleteBlock}
        type="button"
      >
        <span>Delete</span>
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
