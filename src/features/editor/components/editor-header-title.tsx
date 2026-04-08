"use client";

import type { Editor } from "@tiptap/react";
import type { RefObject } from "react";

export type EditorHeaderTitleProps = {
  canEditTitle: boolean;
  commitTitle: () => Promise<void>;
  editor: Editor | null;
  statusLabel: string | null;
  setTitleDraft: (value: string) => void;
  titleDraft: string;
  titleInputRef: RefObject<HTMLInputElement | null>;
};

export function EditorHeaderTitle({
  canEditTitle,
  commitTitle,
  editor,
  setTitleDraft,
  statusLabel,
  titleDraft,
  titleInputRef,
}: EditorHeaderTitleProps) {
  return (
    <div className="inline-flex max-w-full items-center gap-1.5">
      <div className="relative max-w-[min(100%,48rem)]">
        <span
          aria-hidden="true"
          className="invisible block whitespace-pre border-none bg-transparent px-0 text-[1.15rem] font-semibold tracking-[-0.026em] md:text-[1.3rem]"
        >
          {titleDraft || "Untitled"}
        </span>
        <input
          className="absolute inset-0 w-full border-none bg-transparent px-0 text-[1.15rem] font-semibold tracking-[-0.026em] outline-none placeholder:text-[var(--color-muted-foreground)] disabled:cursor-default md:text-[1.3rem]"
          disabled={!canEditTitle}
          name="document-title"
          onBlur={() => void commitTitle()}
          onChange={(event) => setTitleDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }
            event.preventDefault();
            void commitTitle();
            editor?.commands.focus("end");
          }}
          placeholder="Untitled"
          ref={titleInputRef}
          value={titleDraft}
        />
      </div>
      {statusLabel ? (
        <div className="shrink-0 border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-muted-foreground)]">
          {statusLabel}
        </div>
      ) : (
        <div className="invisible shrink-0 border border-[var(--color-border)] px-1.5 py-0.5 text-[11px] font-medium">
          Saved
        </div>
      )}
    </div>
  );
}
