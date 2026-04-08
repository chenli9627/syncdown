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
  saveDocument: SaveDocument;
  setStatus: (value: "idle" | "saving" | "saved" | "error") => void;
};

export function useEditorTitleState({
  canEditTitle,
  documentId,
  documentTitle,
  saveDocument,
  setStatus,
}: UseEditorTitleStateArgs) {
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [titleDraft, setTitleDraft] = useState(documentTitle);
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    if (!canEditTitle || documentTitle.trim()) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [canEditTitle, documentId, documentTitle]);

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
