"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppState } from "@/features/app-state/providers/app-state-provider";
import { ShellSidebar } from "@/features/shell/components/shell-sidebar";
import { useShellWorkspaceActions } from "@/features/shell/hooks/use-shell-workspace-actions";
import { useShellWorkspaceState } from "@/features/shell/hooks/use-shell-workspace-state";

type ShellFrameProps = {
  children: ReactNode;
};

export function ShellFrame({ children }: ShellFrameProps) {
  const router = useRouter();
  const {
    accessibleWorkspaces,
    buckets,
    createDocument,
    createWorkspace,
    currentUser,
    currentWorkspace,
    deleteCurrentWorkspace,
    logout,
    openDocument,
    renameCurrentWorkspace,
    ready,
    switchWorkspace,
  } = useAppState();
  const workspaceState = useShellWorkspaceState();
  const workspaceActions = useShellWorkspaceActions({
    closeWorkspacePopovers: workspaceState.closeWorkspacePopovers,
    createWorkspace,
    currentWorkspaceName: currentWorkspace?.name ?? "",
    deleteConfirmName: workspaceState.deleteConfirmName,
    deleteCurrentWorkspace,
    logout,
    renameCurrentWorkspace,
    renameWorkspaceName: workspaceState.renameWorkspaceName,
    routerPush: (href) => router.push(href as never),
    setDeleteConfirmName: workspaceState.setDeleteConfirmName,
    setIsWorking: workspaceState.setIsWorking,
    setRenameWorkspaceName: workspaceState.setRenameWorkspaceName,
    setShowCreateWorkspace: workspaceState.setShowCreateWorkspace,
    setShowWorkspaceSettings: workspaceState.setShowWorkspaceSettings,
    setWorkspaceError: workspaceState.setWorkspaceError,
    setWorkspaceMenuOpen: workspaceState.setWorkspaceMenuOpen,
    setWorkspaceName: workspaceState.setWorkspaceName,
    setWorkspaceNotice: workspaceState.setWorkspaceNotice,
    switchWorkspace,
    workspaceName: workspaceState.workspaceName,
  });

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!currentUser) {
      router.replace("/login");
    }
  }, [currentUser, ready, router]);

  if (!ready || !currentUser || !currentWorkspace || !buckets) {
    return null;
  }

  const canManageCurrentWorkspace = currentWorkspace.ownerUserId === currentUser.id;
  const guestBadgeClass =
    "shrink-0 rounded-full border border-[#f0d9a7] bg-[#fbefcf] px-2 py-0.5 text-[11px] font-semibold text-[#c98a10]";

  async function handleOpenDocument(documentId: string) {
    const result = await openDocument(documentId);

    if (!result.ok) {
      return;
    }

    router.push(`/documents/${documentId}`);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      <div className="grid h-screen w-full grid-cols-1 bg-[var(--color-card)] md:grid-cols-[248px_minmax(0,1fr)]">
        <ShellSidebar
          accessibleWorkspaces={accessibleWorkspaces}
          buckets={buckets}
          canManageCurrentWorkspace={canManageCurrentWorkspace}
          closeWorkspacePopovers={workspaceState.closeWorkspacePopovers}
          createDocument={createDocument}
          createWorkspaceButtonRef={workspaceState.createWorkspaceButtonRef}
          createWorkspacePopoverRef={workspaceState.createWorkspacePopoverRef}
          currentUser={currentUser}
          currentWorkspace={currentWorkspace}
          deleteConfirmName={workspaceState.deleteConfirmName}
          guestBadgeClass={guestBadgeClass}
          handleOpenDocument={handleOpenDocument}
          isWorking={workspaceState.isWorking}
          onCreateWorkspace={workspaceActions.onCreateWorkspace}
          onDeleteConfirmNameChange={workspaceState.setDeleteConfirmName}
          onDeleteWorkspace={workspaceActions.onDeleteWorkspace}
          onHomeSettingsToggle={workspaceActions.onHomeSettingsToggle}
          onLogout={workspaceActions.onLogout}
          onOpenSettings={workspaceActions.onOpenSettings}
          onRenameWorkspace={workspaceActions.onRenameWorkspace}
          onRenameWorkspaceNameChange={workspaceState.setRenameWorkspaceName}
          onSelectWorkspace={workspaceActions.onSelectWorkspace}
          onShowCreateWorkspaceChange={workspaceActions.onShowCreateWorkspaceChange}
          onToggleWorkspaceMenu={workspaceActions.onToggleWorkspaceMenu}
          onTrashOpen={workspaceActions.onTrashOpen}
          onWorkspaceDocumentCreated={workspaceActions.onWorkspaceDocumentCreated}
          renameWorkspaceName={workspaceState.renameWorkspaceName}
          setWorkspaceError={workspaceState.setWorkspaceError}
          setWorkspaceName={workspaceState.setWorkspaceName}
          setWorkspaceNotice={workspaceState.setWorkspaceNotice}
          showCreateWorkspace={workspaceState.showCreateWorkspace}
          showWorkspaceSettings={workspaceState.showWorkspaceSettings}
          workspaceError={workspaceState.workspaceError}
          workspaceMenuOpen={workspaceState.workspaceMenuOpen}
          workspaceMenuRef={workspaceState.workspaceMenuRef}
          workspaceName={workspaceState.workspaceName}
          workspaceNotice={workspaceState.workspaceNotice}
          workspaceSettingsButtonRef={workspaceState.workspaceSettingsButtonRef}
          workspaceSettingsPopoverRef={workspaceState.workspaceSettingsPopoverRef}
          workspaceTriggerRef={workspaceState.workspaceTriggerRef}
        />

        <main
          className="relative z-0 h-screen min-h-0 overflow-y-auto"
          style={{
            background: "var(--color-editor-surface-gradient)",
            scrollbarGutter: "stable",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
