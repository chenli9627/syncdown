"use client";

import { WorkspaceSwitcherPopover } from "@/features/shell/components/workspace-switcher-popover";
import type { User, Workspace } from "@/features/app-state/types";

type ShellSidebarMenuProps = {
  accessibleWorkspaces: Workspace[];
  createWorkspaceButtonRef: React.RefObject<HTMLButtonElement | null>;
  createWorkspacePopoverRef: React.RefObject<HTMLFormElement | null>;
  currentUser: User;
  currentWorkspaceId: string;
  guestBadgeClass: string;
  isWorking: boolean;
  onClose: () => void;
  onCreateWorkspace: () => Promise<void>;
  onLogout: () => void;
  onOpenSettings: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onShowCreateWorkspaceChange: (value: boolean | ((current: boolean) => boolean)) => void;
  setWorkspaceError: (value: string | null) => void;
  setWorkspaceName: (value: string) => void;
  setWorkspaceNotice: (value: string | null) => void;
  showCreateWorkspace: boolean;
  workspaceError: string | null;
  workspaceMenuOpen: boolean;
  workspaceMenuRef: React.RefObject<HTMLDivElement | null>;
  workspaceName: string;
  workspaceNotice: string | null;
};

export function ShellSidebarMenu({
  accessibleWorkspaces,
  createWorkspaceButtonRef,
  createWorkspacePopoverRef,
  currentUser,
  currentWorkspaceId,
  guestBadgeClass,
  isWorking,
  onClose,
  onCreateWorkspace,
  onLogout,
  onOpenSettings,
  onSelectWorkspace,
  onShowCreateWorkspaceChange,
  setWorkspaceError,
  setWorkspaceName,
  setWorkspaceNotice,
  showCreateWorkspace,
  workspaceError,
  workspaceMenuOpen,
  workspaceMenuRef,
  workspaceName,
  workspaceNotice,
}: ShellSidebarMenuProps) {
  if (!workspaceMenuOpen) {
    return null;
  }

  return (
    <WorkspaceSwitcherPopover
      accessibleWorkspaces={accessibleWorkspaces}
      createWorkspaceButtonRef={createWorkspaceButtonRef}
      createWorkspacePopoverRef={createWorkspacePopoverRef}
      currentUser={currentUser}
      currentWorkspaceId={currentWorkspaceId}
      guestBadgeClass={guestBadgeClass}
      isWorking={isWorking}
      onClose={onClose}
      onCreateWorkspace={onCreateWorkspace}
      onLogout={onLogout}
      onOpenSettings={onOpenSettings}
      onSelectWorkspace={onSelectWorkspace}
      onShowCreateWorkspaceChange={onShowCreateWorkspaceChange}
      setWorkspaceError={setWorkspaceError}
      setWorkspaceName={setWorkspaceName}
      setWorkspaceNotice={setWorkspaceNotice}
      showCreateWorkspace={showCreateWorkspace}
      workspaceError={workspaceError}
      workspaceMenuRef={workspaceMenuRef}
      workspaceName={workspaceName}
      workspaceNotice={workspaceNotice}
    />
  );
}
