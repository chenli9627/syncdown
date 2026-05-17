"use client";

import { useEffect, useRef, useState } from "react";

type SaveDocument = (
  documentId: string,
  patch: { content?: string; title?: string },
) => Promise<
  { error: string; ok: false } | { ok: true; document: { title: string } | null }
>;

type UseEditorTitleStateArgs = {
  canEditTitle: boolean;
  documentId: string;
  documentTitle: string;
  initialFocusTitle?: boolean;
  saveDocument: SaveDocument;
  setStatus: (value: "idle" | "saving" | "saved" | "error") => void;
};

export function useEditorTitleState({
  canEditTitle,
  documentId,
  documentTitle,
  initialFocusTitle = false,
  saveDocument,
  setStatus,
}: UseEditorTitleStateArgs) {
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const initialFocusDocumentIdRef = useRef<string | null>(null);
  const [titleDraft, setTitleDraft] = useState(documentTitle);
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    const shouldApplyInitialFocus =
      initialFocusTitle && initialFocusDocumentIdRef.current !== documentId;
    const shouldFocusBlankTitle = !initialFocusTitle && !documentTitle.trim();

    if (!canEditTitle || (!shouldApplyInitialFocus && !shouldFocusBlankTitle)) {
      return;
    }

    if (shouldApplyInitialFocus) {
      initialFocusDocumentIdRef.current = documentId;
    }

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
  }, [canEditTitle, documentId, documentTitle, initialFocusTitle]);

  async function commitTitle() {
    if (!canEditTitle) {
      return;
    }

    const result = await saveDocument(documentId, { title: titleDraft });

    if (!result.ok) {
      setTitleError(result.error);
      setStatus("error");
      return;
    }

    setTitleDraft(result.document?.title ?? titleDraft);
    setTitleError(null);
    setStatus("saved");
    window.setTimeout(() => {
      setStatus("idle");
    }, 1200);
  }

  return {
    commitTitle,
    setTitleDraft: (value: string) => {
      setTitleDraft(value);
      setTitleError(null);
    },
    titleDraft,
    titleError,
    titleInputRef,
  };
}
