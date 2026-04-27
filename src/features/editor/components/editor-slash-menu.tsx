"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import type { SlashContext, SlashItem } from "@/features/editor/lib/types";

type EditorSlashMenuProps = {
  activeIndex: number;
  editor: Editor | null;
  filteredItems: SlashItem[];
  onActivateItem: (nextIndex: number) => void;
  onClose: () => void;
  open: boolean;
  position: {
    left: number;
    top: number;
  };
  slashContext: SlashContext | null;
};

export function EditorSlashMenu({
  activeIndex,
  editor,
  filteredItems,
  onActivateItem,
  onClose,
  open,
  position,
  slashContext,
}: EditorSlashMenuProps) {
  const { t } = useLocale();
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const activeItem = listRef.current?.querySelector<HTMLElement>(
      `[data-slash-index="${activeIndex}"]`,
    );

    activeItem?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open || !filteredItems.length) {
    return null;
  }

  return (
    <div
      className="absolute z-20 flex max-h-[260px] w-[208px] flex-col border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-soft-card)]"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
      }}
    >
      <div
        className="max-h-[216px] min-h-0 overflow-y-auto overscroll-contain pr-0.5"
        ref={listRef}
      >
        {filteredItems.map((item, itemIndex) => {
          const isActive = itemIndex === activeIndex;

          return (
            <button
              className={`flex w-full items-center justify-between gap-2.5 px-2 py-1.5 text-left text-[12px] transition ${
                isActive
                  ? "bg-[var(--color-hover)] text-[var(--color-foreground)]"
                  : "text-[var(--color-foreground)] hover:bg-[var(--color-hover)]"
              }`}
              data-slash-index={itemIndex}
              key={item.id}
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onMouseEnter={() => {
                onActivateItem(itemIndex >= 0 ? itemIndex : activeIndex);
              }}
              onClick={() => {
                if (!editor || !slashContext) {
                  return;
                }

                editor
                  .chain()
                  .focus()
                  .deleteRange({ from: slashContext.from, to: slashContext.to })
                  .run();
                item.run(editor);
                onClose();
              }}
              type="button"
            >
              <span>{item.label}</span>
              <span className="text-[11px] text-[var(--color-muted-foreground)]">{item.shortcut || " "}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-1 border-t border-[var(--color-border)] pt-1">
        <button
          className="flex w-full items-center justify-between gap-2.5 px-2 py-1.5 text-left text-[11px] text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
          onClick={onClose}
          type="button"
        >
          <span>{t("closeMenu")}</span>
          <span className="text-[10px]">Esc</span>
        </button>
      </div>
    </div>
  );
}
