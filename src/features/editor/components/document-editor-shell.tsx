"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { DocumentShellGate } from "@/features/editor/components/document-shell-gate";
import { EditorSurface } from "@/features/editor/components/editor-surface";
import { useDocumentShellState } from "@/features/editor/hooks/use-document-shell-state";

type DocumentEditorShellProps = {
  documentId: string;
};

export function DocumentEditorShell({ documentId }: DocumentEditorShellProps) {
  const searchParams = useSearchParams();
  const titleFocusRequested = searchParams.get("focus") === "title";
  const {
    currentUser,
    currentWorkspace,
    document,
    permission,
    rawDocument,
    ready,
    saveDocument,
  } = useDocumentShellState(documentId);
  const initialFocusTitle = titleFocusRequested && !isReloadNavigation();

  useEffect(() => {
    if (!titleFocusRequested) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("focus");
    window.history.replaceState(window.history.state, "", url);
  }, [titleFocusRequested]);

  if (!ready || !currentUser) {
    return null;
  }

  if (rawDocument?.status === "trashed") {
    return <DocumentShellGate mode="deleted" />;
  }

  if (rawDocument && !permission) {
    return <DocumentShellGate mode="no_access" />;
  }

  if (!document || !currentWorkspace || !permission) {
    return null;
  }

  return (
    <>
      <style jsx global>{`
        .syntext-editor ul:has(> li > p > a.editor-link.block[href^="#"]),
        .syntext-editor ol:has(> li > p > a.editor-link.block[href^="#"]) {
          margin: 0;
          padding-left: 0;
          list-style: none;
        }

        .syntext-editor li:has(> p > a.editor-link.block[href^="#"]) {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .syntext-editor li:has(> p > a.editor-link.block[href^="#"]) > p {
          margin: 0;
        }
      `}</style>
      <EditorSurface
        document={document}
        initialFocusTitle={initialFocusTitle}
        key={document.id}
        permission={permission}
        saveDocument={saveDocument}
      />
    </>
  );
}

function isReloadNavigation() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigation = window.performance.getEntriesByType("navigation")[0];

  return navigation instanceof PerformanceNavigationTiming && navigation.type === "reload";
}
