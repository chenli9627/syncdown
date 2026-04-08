"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Copy,
  Trash2,
} from "lucide-react";

type EditorTableAxisMenuProps = {
  axis: "column" | "row";
  left: number;
  onAction: (
    action: "delete" | "duplicate" | "insert-above" | "insert-below" | "insert-left" | "insert-right",
  ) => void;
  top: number;
};

export function EditorTableAxisMenu({
  axis,
  left,
  onAction,
  top,
}: EditorTableAxisMenuProps) {
  const items =
    axis === "row"
      ? [
          { action: "insert-above" as const, icon: ArrowUp, label: "Insert above" },
          { action: "insert-below" as const, icon: ArrowDown, label: "Insert below" },
          { action: "duplicate" as const, icon: Copy, label: "Duplicate" },
          { action: "delete" as const, icon: Trash2, label: "Delete", danger: true },
        ]
      : [
          { action: "insert-left" as const, icon: ArrowLeft, label: "Insert left" },
          { action: "insert-right" as const, icon: ArrowRight, label: "Insert right" },
          { action: "duplicate" as const, icon: Copy, label: "Duplicate" },
          { action: "delete" as const, icon: Trash2, label: "Delete", danger: true },
        ];

  return (
    <div
      className="fixed z-[92] w-[172px] border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-soft-card)]"
      style={{ left: `${left}px`, top: `${top}px` }}
    >
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <button
            className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] transition hover:bg-[var(--color-hover)] ${
              item.danger ? "text-[#b44c07]" : "text-[var(--color-foreground)]"
            }`}
            key={item.action}
            onClick={() => {
              onAction(item.action);
            }}
            type="button"
          >
            <Icon className="size-3.5 shrink-0" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
