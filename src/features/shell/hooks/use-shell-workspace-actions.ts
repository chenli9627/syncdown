"use client";

import { useLocale } from "@/components/providers/locale-provider";

type UseShellWorkspaceActionsArgs = {
  closeWorkspacePopovers: () => void;
  createWorkspace: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  currentWorkspaceName: string;
  deleteConfirmName: string;
  deleteCurrentWorkspace: (confirmName: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  renameCurrentWorkspace: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  renameWorkspaceName: string;
  routerPush: (href: string) => void;
  setDeleteConfirmName: (value: string) => void;
  setIsWorking: (value: boolean) => void;
  setRenameWorkspaceName: (value: string) => void;
  setShowCreateWorkspace: (value: boolean | ((current: boolean) => boolean)) => void;
  setShowWorkspaceSettings: (value: boolean | ((current: boolean) => boolean)) => void;
  setWorkspaceError: (value: string | null) => void;
  setWorkspaceMenuOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setWorkspaceName: (value: string) => void;
  setWorkspaceNotice: (value: string | null) => void;
  switchWorkspace: (workspaceId: string) => void;
  workspaceName: string;
};

function resetWorkspaceMessages(args: Pick<
  UseShellWorkspaceActionsArgs,
  "setWorkspaceError" | "setWorkspaceNotice"
>) {
  args.setWorkspaceError(null);
  args.setWorkspaceNotice(null);
}

export function useShellWorkspaceActions(args: UseShellWorkspaceActionsArgs) {
  const { t } = useLocale();

  return {
    onCreateWorkspace: async () => {
      resetWorkspaceMessages(args);
      args.setIsWorking(true);
      const result = await args.createWorkspace(args.workspaceName);
      args.setIsWorking(false);
      if (!result.ok) {
        args.setWorkspaceError(result.error);
        return;
      }
      args.setWorkspaceName("");
      args.closeWorkspacePopovers();
    },
    onDeleteWorkspace: async () => {
      resetWorkspaceMessages(args);
      args.setIsWorking(true);
      const result = await args.deleteCurrentWorkspace(args.deleteConfirmName);
      args.setIsWorking(false);
      if (!result.ok) {
        args.setWorkspaceError(result.error);
        return;
      }
      args.closeWorkspacePopovers();
    },
    onHomeSettingsToggle: () => {
      args.setRenameWorkspaceName(args.currentWorkspaceName);
      args.setDeleteConfirmName("");
      args.setShowWorkspaceSettings((current) => !current);
      args.setWorkspaceMenuOpen(false);
      args.setShowCreateWorkspace(false);
      resetWorkspaceMessages(args);
    },
    onLogout: () => {
      args.logout();
      args.setWorkspaceMenuOpen(false);
      args.routerPush("/login");
    },
    onOpenSettings: () => {
      resetWorkspaceMessages(args);
      args.closeWorkspacePopovers();
      args.routerPush("/settings");
    },
    onRenameWorkspace: async () => {
      resetWorkspaceMessages(args);
      args.setIsWorking(true);
      const result = await args.renameCurrentWorkspace(args.renameWorkspaceName);
      args.setIsWorking(false);
      if (!result.ok) {
        args.setWorkspaceError(result.error);
        return;
      }
      args.setWorkspaceNotice(t("workspaceRenamed"));
      args.setShowWorkspaceSettings(false);
    },
    onSelectWorkspace: (workspaceId: string) => {
      args.switchWorkspace(workspaceId);
      args.routerPush("/home");
    },
    onShowCreateWorkspaceChange: (value: boolean | ((current: boolean) => boolean)) => {
      args.setShowCreateWorkspace(value);
      args.setShowWorkspaceSettings(false);
    },
    onToggleWorkspaceMenu: () => {
      args.setWorkspaceMenuOpen((current) => {
        const next = !current;
        if (!next) {
          args.setShowCreateWorkspace(false);
          args.setShowWorkspaceSettings(false);
        }
        return next;
      });
    },
    onTrashOpen: () => args.routerPush("/trash"),
    onWorkspaceDocumentCreated: (documentId: string) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      args.routerPush(`/documents/${documentId}?focus=title`);
    },
  };
}
