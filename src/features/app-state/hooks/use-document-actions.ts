"use client";

import { useMemo } from "react";
import { canUserOpenDocument, getDocumentById } from "@/features/app-state/lib/state-utils";
import type {
  DocumentRecord,
  Permission,
  Session,
  SyntextState,
  User,
  Workspace,
} from "@/features/app-state/types";
import { readJson } from "@/features/app-state/hooks/use-app-state-sync";
import { type Result } from "@/features/app-state/hooks/app-state-actions-shared";

type UseDocumentActionsArgs = {
  currentUser: User | null;
  currentWorkspace: Workspace | null;
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
  setState: React.Dispatch<React.SetStateAction<SyntextState>>;
  state: SyntextState;
};

export function useDocumentActions({
  currentUser,
  currentWorkspace,
  setSession,
  setState,
  state,
}: UseDocumentActionsArgs) {
  return useMemo(
    () => ({
      createDocument: async () => {
        if (!currentUser || !currentWorkspace) {
          return { ok: false as const, error: "You must be inside a workspace" };
        }

        const response = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            workspaceId: currentWorkspace.id,
          }),
        });
        const data = await readJson<{
          error?: string;
          state?: SyntextState;
          documentId?: string;
        }>(response);

        if (!response.ok || !data.state || !data.documentId) {
          return {
            ok: false as const,
            error: data.error ?? "Document creation failed",
          };
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
          return {
            ok: false,
            error: data.error ?? "Document open failed",
          };
        }

        setState(data.state);

        const document = getDocumentById(data.state, documentId);
        if (document) {
          setSession({
            userId: currentUser.id,
            currentWorkspaceId: document.workspaceId,
          });
        }

        return { ok: true };
      },
      saveDocument: async (
        documentId: string,
        input: { title?: string; content?: string },
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
          }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false as const,
            error: data.error ?? "Document save failed",
          };
        }

        setState(data.state);
        return {
          ok: true as const,
          document: getDocumentById(data.state, documentId),
        };
      },
      getDocument: (documentId: string): DocumentRecord | null => {
        if (!currentUser || !canUserOpenDocument(state, currentUser, documentId)) {
          return null;
        }

        return getDocumentById(state, documentId);
      },
      shareDocument: async (
        documentId: string,
        input: { email: string; permission: Permission },
      ): Promise<Result> => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }

        const response = await fetch(`/api/documents/${documentId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            email: input.email,
            permission: input.permission,
          }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return { ok: false, error: data.error ?? "Document share failed" };
        }

        setState(data.state);
        return { ok: true };
      },
      updateDocumentAccess: async (
        documentId: string,
        targetUserId: string,
        permission: Permission,
      ): Promise<Result> => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }

        const response = await fetch(`/api/documents/${documentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            targetUserId,
            permission,
          }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return { ok: false, error: data.error ?? "Permission update failed" };
        }

        setState(data.state);
        return { ok: true };
      },
      removeDocumentAccess: async (
        documentId: string,
        targetUserId: string,
      ): Promise<Result> => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }

        const response = await fetch(`/api/documents/${documentId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            targetUserId,
          }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return { ok: false, error: data.error ?? "Access removal failed" };
        }

        setState(data.state);
        return { ok: true };
      },
      moveDocumentToTrash: async (documentId: string): Promise<Result> => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }

        const response = await fetch(`/api/documents/${documentId}/trash`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return { ok: false, error: data.error ?? "Move to trash failed" };
        }

        setState(data.state);
        return { ok: true };
      },
      restoreDocumentFromTrash: async (documentId: string): Promise<Result> => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }

        const response = await fetch(`/api/documents/${documentId}/trash`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return { ok: false, error: data.error ?? "Restore failed" };
        }

        setState(data.state);
        return { ok: true };
      },
      permanentlyDeleteDocument: async (documentId: string): Promise<Result> => {
        if (!currentUser) {
          return { ok: false, error: "You must be logged in" };
        }

        const response = await fetch(`/api/documents/${documentId}/trash`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return { ok: false, error: data.error ?? "Delete failed" };
        }

        setState(data.state);
        return { ok: true };
      },
    }),
    [currentUser, currentWorkspace, setSession, setState, state],
  );
}
