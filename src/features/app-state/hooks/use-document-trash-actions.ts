"use client";

import { useMemo } from "react";
import type { Result } from "@/features/app-state/hooks/app-state-actions-shared";
import {
  type UseDocumentActionsArgs,
  readDocumentState,
} from "@/features/app-state/hooks/document-action-shared";

async function runTrashRequest(
  documentId: string,
  userId: string,
  method: "POST" | "PATCH" | "DELETE",
  fallback: string,
  setState: UseDocumentActionsArgs["setState"],
) {
  const response = await fetch(`/api/documents/${documentId}/trash`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  const result = await readDocumentState(response, fallback);
  if (!result.ok) {
    return result;
  }
  setState(result.state);
  return { ok: true as const };
}

export function useDocumentTrashActions({
  currentUser,
  setState,
}: Pick<UseDocumentActionsArgs, "currentUser" | "setState">) {
  return useMemo(
    () => ({
      moveDocumentToTrash: async (documentId: string): Promise<Result> => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }
        return runTrashRequest(documentId, currentUser.id, "POST", "Move to trash failed", setState);
      },
      restoreDocumentFromTrash: async (documentId: string): Promise<Result> => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }
        return runTrashRequest(documentId, currentUser.id, "PATCH", "Restore failed", setState);
      },
      permanentlyDeleteDocument: async (documentId: string): Promise<Result> => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }
        return runTrashRequest(documentId, currentUser.id, "DELETE", "Delete failed", setState);
      },
    }),
    [currentUser, setState],
  );
}
