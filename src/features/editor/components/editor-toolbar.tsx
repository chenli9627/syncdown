"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  normalizeListTransform,
  normalizeParagraphTransform,
  unwrapCodeBlockIfNeeded,
  unwrapListIfNeeded,
} from "@/features/editor/lib/utils";

type ToolbarButtonProps = {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
};

type EditorToolbarProps = {
  canEditBody: boolean;
  editor: Editor | null;
};

function ToolbarButton({
  active,
  children,
  disabled,
  label,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      aria-label={label}
      className={`flex h-9 items-center justify-center gap-1.5 rounded-[4px] border px-2.5 text-[13px] text-[var(--color-muted-foreground)] transition ${
        active
          ? "border-[var(--color-border)] bg-[var(--color-hover)] text-[var(--color-foreground)]"
          : "border-transparent hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
      } disabled:opacity-40`}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={onClick}
      type="button"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

export function EditorToolbar({ canEditBody, editor }: EditorToolbarProps) {
  if (!canEditBody) {
    return null;
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-1 border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-whisper)]">
      <ToolbarButton
        active={Boolean(editor?.isActive("bold"))}
        disabled={!canEditBody}
        label="Bold"
        onClick={() => {
          editor?.chain().focus().toggleBold().run();
        }}
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={Boolean(editor?.isActive("italic"))}
        disabled={!canEditBody}
        label="Italic"
        onClick={() => {
          editor?.chain().focus().toggleItalic().run();
        }}
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={Boolean(editor?.isActive("heading", { level: 1 }))}
        disabled={!canEditBody}
        label="Heading 1"
        onClick={() => {
          if (!editor) {
            return;
          }

          if (editor.isActive("blockquote")) {
            editor.chain().focus().lift("blockquote").setHeading({ level: 1 }).run();
            return;
          }

          normalizeParagraphTransform(editor);
          editor.chain().focus().setHeading({ level: 1 }).run();
        }}
      >
        <Heading1 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={Boolean(editor?.isActive("heading", { level: 2 }))}
        disabled={!canEditBody}
        label="Heading 2"
        onClick={() => {
          if (!editor) {
            return;
          }

          if (editor.isActive("blockquote")) {
            editor.chain().focus().lift("blockquote").setHeading({ level: 2 }).run();
            return;
          }

          normalizeParagraphTransform(editor);
          editor.chain().focus().setHeading({ level: 2 }).run();
        }}
      >
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={Boolean(editor?.isActive("bulletList"))}
        disabled={!canEditBody}
        label="Bulleted list"
        onClick={() => {
          if (!editor) {
            return;
          }

          if (editor.isActive("blockquote")) {
            editor.chain().focus().lift("blockquote").toggleBulletList().run();
            return;
          }

          normalizeListTransform(editor);
          editor.chain().focus().toggleBulletList().run();
        }}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={Boolean(editor?.isActive("orderedList"))}
        disabled={!canEditBody}
        label="Numbered list"
        onClick={() => {
          if (!editor) {
            return;
          }

          if (editor.isActive("blockquote")) {
            editor.chain().focus().lift("blockquote").toggleOrderedList().run();
            return;
          }

          normalizeListTransform(editor);
          editor.chain().focus().toggleOrderedList().run();
        }}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={Boolean(editor?.isActive("blockquote"))}
        disabled={!canEditBody}
        label="Quote"
        onClick={() => {
          if (!editor) {
            return;
          }

          unwrapListIfNeeded(editor);
          unwrapCodeBlockIfNeeded(editor);
          editor.chain().focus().toggleBlockquote().run();
        }}
      >
        <Quote className="size-4" />
      </ToolbarButton>
    </div>
  );
}
