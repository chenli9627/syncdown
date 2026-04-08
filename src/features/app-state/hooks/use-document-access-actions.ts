"use client";

import { useMemo } from "react";
import type { Permission } from "@/features/app-state/types";
import type { Result } from "@/features/app-state/hooks/app-state-actions-shared";
import {
  type UseDocumentActionsArgs,
  readDocumentState,
} from "@/features/app-state/hooks/document-action-shared";

async function runDocumentAccessRequest(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body: Record<string, unknown>,
  fallback: string,
  setState: UseDocumentActionsArgs["setState"],
) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await readDocumentState(response, fallback);
  if (!result.ok) {
    return result;
  }
  setState(result.state);
  return { ok: true as const };
}

export function useDocumentAccessActions({
  currentUser,
  setState,
}: Pick<UseDocumentActionsArgs, "currentUser" | "setState">) {
  return useMemo(
    () => ({
      shareDocument: async (
        documentId: string,
        input: { email: string; permission: Permission },
      ): Promise<Result> => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }
        return runDocumentAccessRequest(
          `/api/documents/${documentId}`,
          "POST",
          { userId: currentUser.id, email: input.email, permission: input.permission },
          "Document share failed",
          setState,
        );
      },
      updateDocumentAccess: async (
        documentId: string,
        targetUserId: string,
        permission: Permission,
      ): Promise<Result> => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }
        return runDocumentAccessRequest(
          `/api/documents/${documentId}`,
          "PUT",
          { userId: currentUser.id, targetUserId, permission },
          "Permission update failed",
          setState,
        );
      },
      removeDocumentAccess: async (
        documentId: string,
        targetUserId: string,
      ): Promise<Result> => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }
        return runDocumentAccessRequest(
          `/api/documents/${documentId}`,
          "DELETE",
          { userId: currentUser.id, targetUserId },
          "Access removal failed",
          setState,
        );
      },
    }),
    [currentUser, setState],
  );
}
