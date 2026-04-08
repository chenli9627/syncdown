"use client";

import { useMemo } from "react";
import { canUserOpenDocument, getDocumentById } from "@/features/app-state/lib/state-utils";
import type { DocumentRecord } from "@/features/app-state/types";
import type { UseDocumentActionsArgs } from "@/features/app-state/hooks/document-action-shared";
import { useDocumentAccessActions } from "@/features/app-state/hooks/use-document-access-actions";
import { useDocumentEditorActions } from "@/features/app-state/hooks/use-document-editor-actions";
import { useDocumentTrashActions } from "@/features/app-state/hooks/use-document-trash-actions";

export function useDocumentActions({
  currentUser,
  currentWorkspace,
  setSession,
  setState,
  state,
}: UseDocumentActionsArgs) {
  const editorActions = useDocumentEditorActions({
    currentUser,
    currentWorkspace,
    setSession,
    setState,
  });
  const accessActions = useDocumentAccessActions({ currentUser, setState });
  const trashActions = useDocumentTrashActions({ currentUser, setState });

  return useMemo(
    () => ({
      ...editorActions,
      getDocument: (documentId: string): DocumentRecord | null => {
        if (!currentUser || !canUserOpenDocument(state, currentUser, documentId)) {
          return null;
        }
        return getDocumentById(state, documentId);
      },
      ...accessActions,
      ...trashActions,
    }),
    [accessActions, currentUser, editorActions, state, trashActions],
  );
}
