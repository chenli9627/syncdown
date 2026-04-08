"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type EditorPermissionDropdownProps = {
  align?: "left" | "right";
  disabled?: boolean;
  onSelect: (value: "can_edit" | "can_view") => void;
  value: "can_edit" | "can_view";
  widthClassName?: string;
};

export function EditorPermissionDropdown({
  align = "left",
  disabled = false,
  onSelect,
  value,
  widthClassName = "w-[96px]",
}: EditorPermissionDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (rootRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    globalThis.document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      globalThis.document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  return (
    <div className={`relative shrink-0 ${widthClassName}`} ref={rootRef}>
      <button
        className="flex h-8 w-full items-center justify-between border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-2 text-xs text-[var(--color-foreground)] transition hover:bg-[var(--color-hover)] disabled:opacity-50"
        disabled={disabled}
        onClick={() => {
          setOpen((current) => !current);
        }}
        type="button"
      >
        <span className="truncate">
          {value === "can_edit" ? "Can edit" : "Can view"}
        </span>
        <ChevronDown
          className={`ml-2 size-3.5 shrink-0 text-[var(--color-muted-foreground)] transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          className={`absolute top-[calc(100%+6px)] z-30 min-w-full border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft-card)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {(["can_view", "can_edit"] as const).map((option) => (
            <button
              className={`flex w-full items-center px-2 py-2 text-left text-xs transition hover:bg-[var(--color-hover)] ${
                option === value
                  ? "bg-[var(--color-hover)] text-[var(--color-foreground)]"
                  : "text-[var(--color-foreground)]"
              }`}
              key={option}
              onClick={() => {
                onSelect(option);
                setOpen(false);
              }}
              type="button"
            >
              {option === "can_edit" ? "Can edit" : "Can view"}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
