"use client";

import { useSearchParams } from "next/navigation";
import { DocumentShellGate } from "@/features/editor/components/document-shell-gate";
import { EditorSurface } from "@/features/editor/components/editor-surface";
import { useDocumentShellState } from "@/features/editor/hooks/use-document-shell-state";

type DocumentEditorShellProps = {
  documentId: string;
};

export function DocumentEditorShell({ documentId }: DocumentEditorShellProps) {
  const searchParams = useSearchParams();
  const {
    currentUser,
    currentWorkspace,
    document,
    permission,
    rawDocument,
    ready,
    saveDocument,
  } = useDocumentShellState(documentId);

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

  const initialFocusTitle =
    searchParams.get("focus") === "title" ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("focus") === "title");

  return (
    <EditorSurface
      document={document}
      initialFocusTitle={initialFocusTitle}
      key={document.id}
      permission={permission}
      saveDocument={saveDocument}
    />
  );
}
