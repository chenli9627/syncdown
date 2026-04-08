"use client";

import { Bold, Code2, Italic, Sparkles, Strikethrough } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/components/providers/locale-provider";
import type { SelectionBubbleState } from "@/features/editor/lib/types";

type EditorSelectionBubbleProps = {
  onFormat: (command: "bold" | "italic" | "strike" | "code") => void;
  onOpenAi: () => void;
  selectionBubble: SelectionBubbleState;
  selectionBubbleRef: RefObject<HTMLDivElement | null>;
};

export function EditorSelectionBubble({
  onFormat,
  onOpenAi,
  selectionBubble,
  selectionBubbleRef,
}: EditorSelectionBubbleProps) {
  const { t } = useLocale();

  if (!selectionBubble.open || !globalThis.document?.body) {
    return null;
  }

  return createPortal(
    <div
      className="fixed z-[92] flex items-center gap-1 border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-soft-card)]"
      ref={selectionBubbleRef}
      style={{
        left: `${selectionBubble.left}px`,
        top: `${selectionBubble.top}px`,
        transform: "translateX(-50%)",
      }}
    >
      <SelectionActionButton icon={<Bold className="size-4" />} label="Bold" onClick={() => onFormat("bold")} />
      <SelectionActionButton icon={<Italic className="size-4" />} label="Italic" onClick={() => onFormat("italic")} />
      <SelectionActionButton
        icon={<Strikethrough className="size-4" />}
        label="Strike"
        onClick={() => onFormat("strike")}
      />
      <SelectionActionButton icon={<Code2 className="size-4" />} label="Code" onClick={() => onFormat("code")} />
      <SelectionActionButton
        icon={<Sparkles className="size-4" />}
        label={t("ai")}
        onClick={onOpenAi}
      />
    </div>,
    globalThis.document.body,
  );
}

type SelectionActionButtonProps = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

function SelectionActionButton({ icon, label, onClick }: SelectionActionButtonProps) {
  return (
    <button
      className="flex h-8 min-w-8 items-center justify-center border border-transparent px-2 text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
      onClick={onClick}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}
