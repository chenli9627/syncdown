"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AiChatModelKey } from "@/features/app-state/types";
import { cn } from "@/lib/utils";

type AiModelOption = {
  key: AiChatModelKey;
  name: string;
};

type EditorAiModelSelectProps = {
  models: AiModelOption[];
  onChange: (value: AiChatModelKey) => void;
  value: AiChatModelKey;
};

export function EditorAiModelSelect({
  models,
  onChange,
  value,
}: EditorAiModelSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const options = [
    {
      key: "primary" as const,
      name: models.find((model) => model.key === "primary")?.name ?? "Primary model",
    },
    {
      key: "secondary" as const,
      name: models.find((model) => model.key === "secondary")?.name ?? "Secondary model",
    },
  ];
  const selectedModel = options.find((model) => model.key === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        rootRef.current?.contains(event.target)
      ) {
        return;
      }

      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative min-w-0 flex-1" ref={rootRef}>
      <button
        aria-expanded={open}
        className="flex h-8 w-full min-w-0 items-center justify-between gap-2 border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-left text-xs text-[var(--color-foreground)] shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-hover)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_24%,transparent)]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="truncate">{selectedModel.name}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-3.5 shrink-0 transition", open ? "rotate-180" : "")}
        />
      </button>
      {open ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-soft-card)]"
          role="listbox"
        >
          {options.map((model) => {
            const selected = model.key === value;

            return (
              <button
                aria-selected={selected}
                className={cn(
                  "flex h-8 w-full items-center justify-between gap-2 px-2 text-left text-xs transition hover:bg-[var(--color-hover)]",
                  selected
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                    : "text-[var(--color-foreground)]",
                )}
                key={model.key}
                onClick={() => {
                  onChange(model.key);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <span className="truncate">{model.name}</span>
                {selected ? <Check aria-hidden="true" className="size-3.5 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
