"use client";

import Image from "next/image";
import { useLocale } from "@/components/providers/locale-provider";
import { getWorkspaceBuckets } from "@/features/app-state/lib/state-utils";
import type { User, Workspace } from "@/features/app-state/types";
import { ShellSidebarMenu } from "@/features/shell/components/shell-sidebar-menu";
import { ShellSidebarSections } from "@/features/shell/components/shell-sidebar-sections";

type ShellSidebarProps = {
  accessibleWorkspaces: Workspace[];
  buckets: ReturnType<typeof getWorkspaceBuckets>;
  canManageCurrentWorkspace: boolean;
  children?: never;
  closeWorkspacePopovers: () => void;
  createDocument: () => Promise<{ ok: true; documentId: string } | { ok: false; error: string }>;
  createWorkspaceButtonRef: React.RefObject<HTMLButtonElement | null>;
  createWorkspacePopoverRef: React.RefObject<HTMLFormElement | null>;
  currentUser: User;
  currentWorkspace: Workspace;
  deleteConfirmName: string;
  guestBadgeClass: string;
  handleOpenDocument: (documentId: string) => Promise<void>;
  isWorking: boolean;
  onCreateWorkspace: () => Promise<void>;
  onDeleteConfirmNameChange: (value: string) => void;
  onDeleteWorkspace: () => Promise<void>;
  onHomeSettingsToggle: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onRenameWorkspace: () => Promise<void>;
  onRenameWorkspaceNameChange: (value: string) => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onShowCreateWorkspaceChange: (value: boolean | ((current: boolean) => boolean)) => void;
  onTrashOpen: () => void;
  onToggleWorkspaceMenu: () => void;
  onWorkspaceDocumentCreated: (documentId: string) => void;
  renameWorkspaceName: string;
  setWorkspaceError: (value: string | null) => void;
  setWorkspaceName: (value: string) => void;
  setWorkspaceNotice: (value: string | null) => void;
  showCreateWorkspace: boolean;
  showWorkspaceSettings: boolean;
  workspaceError: string | null;
  workspaceMenuOpen: boolean;
  workspaceMenuRef: React.RefObject<HTMLDivElement | null>;
  workspaceName: string;
  workspaceNotice: string | null;
  workspaceSettingsButtonRef: React.RefObject<HTMLButtonElement | null>;
  workspaceSettingsPopoverRef: React.RefObject<HTMLDivElement | null>;
  workspaceTriggerRef: React.RefObject<HTMLButtonElement | null>;
};

function WorkspaceCard({
  currentUser,
  currentWorkspace,
  guestBadgeClass,
  isGuest,
  onToggle,
  workspaceTriggerRef,
}: {
  currentUser: User;
  currentWorkspace: Workspace;
  guestBadgeClass: string;
  isGuest: boolean;
  onToggle: () => void;
  workspaceTriggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useLocale();
  return (
    <button
      className="flex w-full min-w-0 items-center gap-2.5 border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-3 py-3 text-left shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-card)]"
      ref={workspaceTriggerRef}
      onClick={onToggle}
      type="button"
    >
      {currentUser.avatarUrl ? (
        <Image
          alt={currentUser.name}
          className="size-9 shrink-0 rounded-full object-cover"
          height={40}
          src={currentUser.avatarUrl}
          unoptimized
          width={40}
        />
      ) : (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-semibold text-white">
          {currentUser.name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">
          {currentWorkspace.name}
        </p>
        {isGuest ? <span className={guestBadgeClass}>{t("guest")}</span> : null}
      </div>
    </button>
  );
}

export function ShellSidebar({
  accessibleWorkspaces,
  buckets,
  canManageCurrentWorkspace,
  closeWorkspacePopovers,
  createDocument,
  createWorkspaceButtonRef,
  createWorkspacePopoverRef,
  currentUser,
  currentWorkspace,
  deleteConfirmName,
  guestBadgeClass,
  handleOpenDocument,
  isWorking,
  onCreateWorkspace,
  onDeleteConfirmNameChange,
  onDeleteWorkspace,
  onHomeSettingsToggle,
  onLogout,
  onOpenSettings,
  onRenameWorkspace,
  onRenameWorkspaceNameChange,
  onSelectWorkspace,
  onShowCreateWorkspaceChange,
  onTrashOpen,
  onToggleWorkspaceMenu,
  onWorkspaceDocumentCreated,
  renameWorkspaceName,
  setWorkspaceError,
  setWorkspaceName,
  setWorkspaceNotice,
  showCreateWorkspace,
  showWorkspaceSettings,
  workspaceError,
  workspaceMenuOpen,
  workspaceMenuRef,
  workspaceName,
  workspaceNotice,
  workspaceSettingsButtonRef,
  workspaceSettingsPopoverRef,
  workspaceTriggerRef,
}: ShellSidebarProps) {
  const isGuest = currentWorkspace.ownerUserId !== currentUser.id;

  async function handleCreateDocument() {
    const result = await createDocument();
    if (!result.ok) {
      return;
    }
    onWorkspaceDocumentCreated(result.documentId);
  }

  return (
    <aside className="relative z-20 flex h-screen min-h-0 min-w-0 flex-col overflow-visible border-r border-[var(--color-border)] bg-[var(--color-sidebar)] p-2.5 text-[var(--color-sidebar-foreground)]">
      <div className="relative z-30">
        <WorkspaceCard
          currentUser={currentUser}
          currentWorkspace={currentWorkspace}
          guestBadgeClass={guestBadgeClass}
          isGuest={isGuest}
          onToggle={onToggleWorkspaceMenu}
          workspaceTriggerRef={workspaceTriggerRef}
        />
        <ShellSidebarMenu
          accessibleWorkspaces={accessibleWorkspaces}
          createWorkspaceButtonRef={createWorkspaceButtonRef}
          createWorkspacePopoverRef={createWorkspacePopoverRef}
          currentUser={currentUser}
          currentWorkspaceId={currentWorkspace.id}
          guestBadgeClass={guestBadgeClass}
          isWorking={isWorking}
          onClose={closeWorkspacePopovers}
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
          workspaceMenuOpen={workspaceMenuOpen}
          workspaceMenuRef={workspaceMenuRef}
          workspaceName={workspaceName}
          workspaceNotice={workspaceNotice}
        />
      </div>
      <ShellSidebarSections
        buckets={buckets}
        canManageCurrentWorkspace={canManageCurrentWorkspace}
        currentWorkspace={currentWorkspace}
        deleteConfirmName={deleteConfirmName}
        handleOpenDocument={handleOpenDocument}
        isWorking={isWorking}
        onCreateDocument={handleCreateDocument}
        onDeleteConfirmNameChange={onDeleteConfirmNameChange}
        onDeleteWorkspace={onDeleteWorkspace}
        onRenameWorkspace={onRenameWorkspace}
        onRenameWorkspaceNameChange={onRenameWorkspaceNameChange}
        onSettingsToggle={onHomeSettingsToggle}
        onTrashOpen={onTrashOpen}
        renameWorkspaceName={renameWorkspaceName}
        settingsButtonRef={workspaceSettingsButtonRef}
        showWorkspaceSettings={showWorkspaceSettings}
        workspaceSettingsPopoverRef={workspaceSettingsPopoverRef}
      />
    </aside>
  );
}
