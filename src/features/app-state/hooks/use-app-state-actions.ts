"use client";

import { useMemo } from "react";
import type { DocumentRecord, Permission, Session, SyntextState, User, Workspace } from "@/features/app-state/types";
import { useAuthActions } from "@/features/app-state/hooks/use-auth-actions";
import { useDocumentActions } from "@/features/app-state/hooks/use-document-actions";
import { type RegisterInput, type Result } from "@/features/app-state/hooks/app-state-actions-shared";
import { useWorkspaceActions } from "@/features/app-state/hooks/use-workspace-actions";

export type { RegisterInput, Result } from "@/features/app-state/hooks/app-state-actions-shared";

export type AppStateActions = {
  login: (username: string, password: string) => Promise<Result>;
  register: (input: RegisterInput) => Promise<Result>;
  logout: () => void;
  updateProfileName: (userId: string, name: string) => Promise<Result>;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<Result>;
  renameCurrentWorkspace: (name: string) => Promise<Result>;
  deleteCurrentWorkspace: (confirmName: string) => Promise<Result>;
  createDocument: () => Promise<
    | {
        ok: true;
        documentId: string;
      }
    | {
        ok: false;
        error: string;
      }
  >;
  openDocument: (documentId: string) => Promise<Result>;
  saveDocument: (
    documentId: string,
    input: { title?: string; content?: string },
  ) => Promise<
    | {
        ok: true;
        document: DocumentRecord | null;
      }
    | {
        ok: false;
        error: string;
      }
  >;
  getDocument: (documentId: string) => DocumentRecord | null;
  shareDocument: (
    documentId: string,
    input: { email: string; permission: Permission },
  ) => Promise<Result>;
  updateDocumentAccess: (
    documentId: string,
    targetUserId: string,
    permission: Permission,
  ) => Promise<Result>;
  removeDocumentAccess: (documentId: string, targetUserId: string) => Promise<Result>;
  moveDocumentToTrash: (documentId: string) => Promise<Result>;
  restoreDocumentFromTrash: (documentId: string) => Promise<Result>;
  permanentlyDeleteDocument: (documentId: string) => Promise<Result>;
};

type UseAppStateActionsArgs = {
  currentUser: User | null;
  currentWorkspace: Workspace | null;
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
  setState: React.Dispatch<React.SetStateAction<SyntextState>>;
  state: SyntextState;
};

export function useAppStateActions({
  currentUser,
  currentWorkspace,
  setSession,
  setState,
  state,
}: UseAppStateActionsArgs) {
  const authActions = useAuthActions({ setSession, setState });
  const workspaceActions = useWorkspaceActions({
    currentUser,
    currentWorkspace,
    setSession,
    setState,
  });
  const documentActions = useDocumentActions({
    currentUser,
    currentWorkspace,
    setSession,
    setState,
    state,
  });

  return useMemo<AppStateActions>(
    () => ({
      ...authActions,
      ...workspaceActions,
      ...documentActions,
    }),
    [authActions, documentActions, workspaceActions],
  );
}
