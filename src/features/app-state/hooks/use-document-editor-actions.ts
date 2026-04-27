"use client";

import { useMemo } from "react";
import { getDocumentById } from "@/features/app-state/lib/state-utils";
import type { SyntextState } from "@/features/app-state/types";
import { readJson } from "@/features/app-state/hooks/use-app-state-sync";
import type { Result } from "@/features/app-state/hooks/app-state-actions-shared";
import type { UseDocumentActionsArgs } from "@/features/app-state/hooks/document-action-shared";

export function useDocumentEditorActions({
  currentUser,
  currentWorkspace,
  setSession,
  setState,
}: Pick<UseDocumentActionsArgs, "currentUser" | "currentWorkspace" | "setSession" | "setState">) {
  return useMemo(
    () => ({
      createDocument: async () => {
        if (!currentUser || !currentWorkspace) {
          return { ok: false as const, error: "You must be inside a workspace" };
        }
        const response = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id, workspaceId: currentWorkspace.id }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState; documentId?: string }>(
          response,
        );
        if (!response.ok || !data.state || !data.documentId) {
          return { ok: false as const, error: data.error ?? "Document creation failed" };
        }
        setState(data.state);
        return { ok: true as const, documentId: data.documentId };
      },
      openDocument: async (documentId: string): Promise<Result> => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }
        const response = await fetch(`/api/documents/${documentId}/visit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);
        if (!response.ok || !data.state) {
          return { ok: false, error: data.error ?? "Document open failed" };
        }
        setState(data.state);
        const document = getDocumentById(data.state, documentId);
        if (document) {
          setSession({ userId: currentUser.id, currentWorkspaceId: document.workspaceId });
        }
        return { ok: true };
      },
      saveDocument: async (
        documentId: string,
        input: { title?: string; content?: string; versionHistoryMode?: "force" | "merge" | "snapshot" },
      ) => {
        if (!currentUser) {
          return { ok: false as const, error: "You must be logged in" };
        }
        const response = await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            title: input.title,
            content: input.content,
            versionHistoryMode: input.versionHistoryMode,
          }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);
        if (!response.ok || !data.state) {
          return { ok: false as const, error: data.error ?? "Document save failed" };
        }
        setState(data.state);
        return { ok: true as const, document: getDocumentById(data.state, documentId) };
      },
    }),
    [currentUser, currentWorkspace, setSession, setState],
  );
}
