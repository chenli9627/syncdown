"use client";

import type { Editor } from "@tiptap/react";
import { useLocale } from "@/components/providers/locale-provider";
import type { SlashContext, SlashItem } from "@/features/editor/lib/types";

type EditorSlashMenuProps = {
  activeIndex: number;
  editor: Editor | null;
  enabledItems: SlashItem[];
  filteredItems: SlashItem[];
  onActivateItem: (enabledIndex: number) => void;
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
  enabledItems,
  filteredItems,
  onActivateItem,
  onClose,
  open,
  position,
  slashContext,
}: EditorSlashMenuProps) {
  const { t } = useLocale();
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
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const enabledIndex = enabledItems.findIndex((candidate) => candidate.id === item.id);
          const isActive = item.enabled && enabledIndex === activeIndex;

          return (
            <button
              className={`flex w-full items-center justify-between gap-2.5 px-2 py-1.5 text-left text-[12px] transition ${
                item.enabled
                  ? isActive
                    ? "bg-[var(--color-hover)] text-[var(--color-foreground)]"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-hover)]"
                  : "cursor-not-allowed text-[var(--color-muted-foreground)] opacity-55"
              }`}
              disabled={!item.enabled}
              key={item.id}
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onMouseEnter={() => {
                if (!item.enabled) {
                  return;
                }

                onActivateItem(enabledIndex >= 0 ? enabledIndex : activeIndex);
              }}
              onClick={() => {
                if (!editor || !item.enabled || !slashContext) {
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
              <span className="text-[11px] text-[var(--color-muted-foreground)]">
                {item.enabled ? item.shortcut || " " : t("soon")}
              </span>
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
