"use client";

import type { Editor } from "@tiptap/react";
import { Bold, Code2, Italic, Sparkles, Strikethrough } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/components/providers/locale-provider";
import type { SelectionBubbleState } from "@/features/editor/lib/types";

type EditorSelectionBubbleProps = {
  editor: Editor | null;
  onFormat: (command: "bold" | "italic" | "strike" | "code") => void;
  onOpenAi: () => void;
  selectionBubble: SelectionBubbleState;
  selectionBubbleRef: RefObject<HTMLDivElement | null>;
};

export function EditorSelectionBubble({
  editor,
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
      className="fixed z-[92] flex items-center gap-0.5 border border-[var(--color-border)] bg-[var(--color-card)] p-0.5 shadow-[var(--shadow-soft-card)]"
      ref={selectionBubbleRef}
      style={{
        left: `${selectionBubble.left}px`,
        top: `${selectionBubble.top}px`,
        transform: "translateX(-50%)",
      }}
    >
      <SelectionActionButton
        active={Boolean(editor?.isActive("bold"))}
        icon={<Bold className="size-4" />}
        label="Bold"
        onClick={() => onFormat("bold")}
      />
      <SelectionActionButton
        active={Boolean(editor?.isActive("italic"))}
        icon={<Italic className="size-4" />}
        label="Italic"
        onClick={() => onFormat("italic")}
      />
      <SelectionActionButton
        active={Boolean(editor?.isActive("strike"))}
        icon={<Strikethrough className="size-4" />}
        label="Strike"
        onClick={() => onFormat("strike")}
      />
      <SelectionActionButton
        active={Boolean(editor?.isActive("code"))}
        icon={<Code2 className="size-4" />}
        label="Code"
        onClick={() => onFormat("code")}
      />
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
  active?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

function SelectionActionButton({
  active,
  icon,
  label,
  onClick,
}: SelectionActionButtonProps) {
  return (
    <button
      className={`flex h-7 min-w-7 items-center justify-center border px-1.5 transition ${
        active
          ? "border-[var(--color-border)] bg-[var(--color-hover)] text-[var(--color-foreground)]"
          : "border-transparent text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
      }`}
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
