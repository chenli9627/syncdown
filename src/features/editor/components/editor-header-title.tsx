"use client";

import type { Editor } from "@tiptap/react";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/components/providers/locale-provider";

export type EditorHeaderTitleProps = {
  canEditTitle: boolean;
  commitTitle: () => Promise<void>;
  documentId: string;
  editor: Editor | null;
  initialFocusTitle?: boolean;
  statusLabel: string | null;
  setTitleDraft: (value: string) => void;
  titleDraft: string;
  titleInputRef: RefObject<HTMLInputElement | null>;
};

export function EditorHeaderTitle({
  canEditTitle,
  commitTitle,
  documentId,
  editor,
  initialFocusTitle = false,
  setTitleDraft,
  statusLabel,
  titleDraft,
  titleInputRef,
}: EditorHeaderTitleProps) {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const initialFocusDocumentIdRef = useRef<string | null>(null);
  const pendingInitialSelectionDocumentIdRef = useRef<string | null>(null);
  const shouldInitialFocus =
    initialFocusTitle || searchParams.get("focus") === "title";

  useEffect(() => {
    if (!canEditTitle || !shouldInitialFocus) {
      return;
    }

    if (initialFocusDocumentIdRef.current === documentId) {
      return;
    }

    initialFocusDocumentIdRef.current = documentId;
    pendingInitialSelectionDocumentIdRef.current = documentId;

    let timeoutId = 0;
    let attempts = 0;

    const applyFocus = () => {
      const input = titleInputRef.current;

      if (input) {
        input.focus({ preventScroll: true });
        input.select();

        if (document.activeElement === input) {
          return;
        }
      }

      if (attempts >= 10) {
        return;
      }

      attempts += 1;
      timeoutId = window.setTimeout(applyFocus, 50);
    };

    timeoutId = window.setTimeout(applyFocus, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [canEditTitle, documentId, shouldInitialFocus, titleInputRef]);

  return (
    <div className="inline-flex max-w-full items-center gap-1.5">
      <div className="relative max-w-[min(100%,48rem)]">
        <span
          aria-hidden="true"
          className="invisible block whitespace-pre border-none bg-transparent px-0 text-[1.15rem] font-semibold tracking-[-0.026em] md:text-[1.3rem]"
        >
          {titleDraft || t("untitled")}
        </span>
        <input
          autoFocus={canEditTitle && shouldInitialFocus}
          className="absolute inset-0 w-full border-none bg-transparent px-0 text-[1.15rem] font-semibold tracking-[-0.026em] outline-none placeholder:text-[var(--color-muted-foreground)] disabled:cursor-default md:text-[1.3rem]"
          disabled={!canEditTitle}
          name="document-title"
          onBlur={() => void commitTitle()}
          onChange={(event) => setTitleDraft(event.target.value)}
          onFocus={(event) => {
            if (pendingInitialSelectionDocumentIdRef.current !== documentId) {
              return;
            }

            event.currentTarget.select();
            pendingInitialSelectionDocumentIdRef.current = null;
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }
            event.preventDefault();
            void commitTitle();
            editor?.commands.focus("end");
          }}
          placeholder={t("untitled")}
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
          {t("saved")}
        </div>
      )}
    </div>
  );
}
