"use client";

import type { Editor } from "@tiptap/react";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
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
  const selectionGuardTimeoutRef = useRef<number | null>(null);
  const shouldInitialFocus =
    initialFocusTitle || searchParams.get("focus") === "title";

  const startSelectionGuard = useCallback(() => {
    if (selectionGuardTimeoutRef.current) {
      window.clearTimeout(selectionGuardTimeoutRef.current);
      selectionGuardTimeoutRef.current = null;
    }

    let attempts = 0;
    const initialTitleValue = titleDraft;

    const enforceSelection = () => {
      const input = titleInputRef.current;

      if (!input) {
        return;
      }

      if (
        pendingInitialSelectionDocumentIdRef.current !== documentId ||
        input.value !== initialTitleValue
      ) {
        pendingInitialSelectionDocumentIdRef.current = null;
        return;
      }

      input.focus({ preventScroll: true });
      input.setSelectionRange(0, input.value.length);

      if (attempts >= 40) {
        return;
      }

      attempts += 1;
      selectionGuardTimeoutRef.current = window.setTimeout(enforceSelection, 50);
    };

    enforceSelection();
  }, [documentId, titleDraft, titleInputRef]);

  useEffect(() => {
    return () => {
      if (selectionGuardTimeoutRef.current) {
        window.clearTimeout(selectionGuardTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!canEditTitle || !shouldInitialFocus) {
      return;
    }

    if (initialFocusDocumentIdRef.current === documentId) {
      return;
    }

    initialFocusDocumentIdRef.current = documentId;
    pendingInitialSelectionDocumentIdRef.current = documentId;
    const timeoutId = window.setTimeout(startSelectionGuard, 0);

    const handlePointerUp = () => {
      const input = titleInputRef.current;

      if (!input || pendingInitialSelectionDocumentIdRef.current !== documentId) {
        return;
      }

      window.requestAnimationFrame(() => {
        const currentInput = titleInputRef.current;

        if (!currentInput) {
          return;
        }

        if (
          pendingInitialSelectionDocumentIdRef.current !== documentId ||
          currentInput.value !== titleDraft
        ) {
          pendingInitialSelectionDocumentIdRef.current = null;
          return;
        }

        startSelectionGuard();
      });
    };

    window.addEventListener("pointerup", handlePointerUp, true);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("pointerup", handlePointerUp, true);
    };
  }, [canEditTitle, documentId, shouldInitialFocus, startSelectionGuard, titleDraft, titleInputRef]);

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
            startSelectionGuard();
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
