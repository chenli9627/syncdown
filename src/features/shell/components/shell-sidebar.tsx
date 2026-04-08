"use client";

import { House, Plus, Settings2, Trash2 } from "lucide-react";
import Link from "next/link";
import { getWorkspaceBuckets } from "@/features/app-state/lib/state-utils";
import type { User, Workspace } from "@/features/app-state/types";
import { SidebarSection } from "@/features/shell/components/sidebar-section";
import { WorkspaceSettingsPopover } from "@/features/shell/components/workspace-settings-popover";
import { WorkspaceSwitcherPopover } from "@/features/shell/components/workspace-switcher-popover";

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
  currentWorkspace,
  guestBadgeClass,
  isGuest,
  onToggle,
  workspaceTriggerRef,
}: {
  currentWorkspace: Workspace;
  guestBadgeClass: string;
  isGuest: boolean;
  onToggle: () => void;
  workspaceTriggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      className="flex w-full items-center gap-3 border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-3 py-3 text-left shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-card)]"
      ref={workspaceTriggerRef}
      onClick={onToggle}
      type="button"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary-foreground)]">
        {currentWorkspace.name.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <p className="truncate text-[15px] font-semibold">{currentWorkspace.name}</p>
        {isGuest ? <span className={guestBadgeClass}>Guest</span> : null}
      </div>
    </button>
  );
}

function HomeRow({
  canManageCurrentWorkspace,
  currentWorkspace,
  onCreateDocument,
  onSettingsToggle,
  settingsButtonRef,
  showWorkspaceSettings,
}: {
  canManageCurrentWorkspace: boolean;
  currentWorkspace: Workspace;
  onCreateDocument: () => Promise<void>;
  onSettingsToggle: () => void;
  settingsButtonRef: React.RefObject<HTMLButtonElement | null>;
  showWorkspaceSettings: boolean;
}) {
  return (
    <div className="flex items-center gap-2 border border-transparent bg-[var(--color-sidebar-panel)] px-3.5 py-3 text-sm font-medium shadow-[var(--shadow-whisper)]">
      <Link
        className="flex min-w-0 flex-1 items-center gap-3 transition hover:text-[var(--color-foreground)]"
        href="/home"
      >
        <House className="size-4 text-[var(--color-muted-foreground)]" />
        Home
      </Link>
      {canManageCurrentWorkspace ? (
        <>
          <button
            className="flex size-8 items-center justify-center text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
            title="New document"
            onClick={onCreateDocument}
            type="button"
          >
            <Plus className="size-4" />
          </button>
          <button
            className="flex size-8 items-center justify-center text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
            ref={settingsButtonRef}
            title="Workspace settings"
            onClick={onSettingsToggle}
            type="button"
          >
            <Settings2 className="size-4" />
          </button>
        </>
      ) : null}
      <span className="sr-only">
        {showWorkspaceSettings ? `${currentWorkspace.name} settings open` : ""}
      </span>
    </div>
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
    <aside className="relative z-20 flex h-screen min-h-0 flex-col overflow-visible border-r border-[var(--color-border)] bg-[var(--color-sidebar)] p-2.5 text-[var(--color-sidebar-foreground)]">
      <div className="relative z-30">
        <WorkspaceCard
          currentWorkspace={currentWorkspace}
          guestBadgeClass={guestBadgeClass}
          isGuest={isGuest}
          onToggle={onToggleWorkspaceMenu}
          workspaceTriggerRef={workspaceTriggerRef}
        />
        {workspaceMenuOpen ? (
          <WorkspaceSwitcherPopover
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
            workspaceMenuRef={workspaceMenuRef}
            workspaceName={workspaceName}
            workspaceNotice={workspaceNotice}
          />
        ) : null}
      </div>

      <nav className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
        <div className="relative">
          <HomeRow
            canManageCurrentWorkspace={canManageCurrentWorkspace}
            currentWorkspace={currentWorkspace}
            onCreateDocument={handleCreateDocument}
            onSettingsToggle={onHomeSettingsToggle}
            settingsButtonRef={workspaceSettingsButtonRef}
            showWorkspaceSettings={showWorkspaceSettings}
          />
          {showWorkspaceSettings && canManageCurrentWorkspace ? (
            <WorkspaceSettingsPopover
              currentWorkspaceName={currentWorkspace.name}
              deleteConfirmName={deleteConfirmName}
              isWorking={isWorking}
              onDeleteConfirmNameChange={onDeleteConfirmNameChange}
              onDeleteWorkspace={onDeleteWorkspace}
              onRenameWorkspace={onRenameWorkspace}
              onRenameWorkspaceNameChange={onRenameWorkspaceNameChange}
              renameWorkspaceName={renameWorkspaceName}
              workspaceSettingsPopoverRef={workspaceSettingsPopoverRef}
            />
          ) : null}
        </div>
        <div className="grid min-h-0 flex-1 gap-3">
          <SidebarSection items={buckets.recents} onOpenItem={handleOpenDocument} title="Recents" />
          <SidebarSection items={buckets.shared} onOpenItem={handleOpenDocument} title="Shared" />
          {canManageCurrentWorkspace ? (
            <SidebarSection
              items={buckets.privateDocs}
              onOpenItem={handleOpenDocument}
              title="Private"
            />
          ) : null}
        </div>
      </nav>

      {canManageCurrentWorkspace ? (
        <button
          className="mt-3 flex w-full items-center gap-3 border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-3.5 py-3 text-left text-sm font-medium shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-card)]"
          onClick={onTrashOpen}
          type="button"
        >
          <div className="flex items-center gap-3">
            <Trash2 className="size-4 text-[var(--color-muted-foreground)]" />
            Trash
          </div>
        </button>
      ) : null}
    </aside>
  );
}
