"use client";

import type { Editor } from "@tiptap/react";

type SlashItem = {
  id: string;
  label: string;
  shortcut: string;
  enabled: boolean;
  run: (editor: Editor) => void;
};

type SlashContext = {
  from: number;
  query: string;
  to: number;
};

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
  if (!open || !filteredItems.length) {
    return null;
  }

  return (
    <div
      className="absolute z-20 max-h-[260px] w-[216px] overflow-y-auto border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-soft-card)]"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
      }}
    >
      {filteredItems.map((item) => {
        const enabledIndex = enabledItems.findIndex((candidate) => candidate.id === item.id);
        const isActive = item.enabled && enabledIndex === activeIndex;

        return (
          <button
            className={`flex w-full items-center justify-between gap-3 px-2.5 py-2 text-left text-[13px] transition ${
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
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {item.enabled ? item.shortcut || " " : "Soon"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
