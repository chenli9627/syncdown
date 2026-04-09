"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { SidebarSection } from "@/features/shell/components/sidebar-section";
import { WorkspaceSettingsPopover } from "@/features/shell/components/workspace-settings-popover";
import type { getWorkspaceBuckets } from "@/features/app-state/lib/state-utils";
import type { Workspace } from "@/features/app-state/types";
import { House, Plus, Settings2, Trash2 } from "lucide-react";
import Link from "next/link";

type ShellSidebarSectionsProps = {
  buckets: ReturnType<typeof getWorkspaceBuckets>;
  canManageCurrentWorkspace: boolean;
  currentWorkspace: Workspace;
  deleteConfirmName: string;
  handleOpenDocument: (documentId: string) => Promise<void>;
  isWorking: boolean;
  onCreateDocument: () => Promise<void>;
  onDeleteConfirmNameChange: (value: string) => void;
  onDeleteWorkspace: () => Promise<void>;
  onRenameWorkspace: () => Promise<void>;
  onRenameWorkspaceNameChange: (value: string) => void;
  onSettingsToggle: () => void;
  onTrashOpen: () => void;
  renameWorkspaceName: string;
  settingsButtonRef: React.RefObject<HTMLButtonElement | null>;
  showWorkspaceSettings: boolean;
  workspaceSettingsPopoverRef: React.RefObject<HTMLDivElement | null>;
};

function HomeRow({
  canManageCurrentWorkspace,
  currentWorkspace,
  onCreateDocument,
  onSettingsToggle,
  settingsButtonRef,
}: {
  canManageCurrentWorkspace: boolean;
  currentWorkspace: Workspace;
  onCreateDocument: () => Promise<void>;
  onSettingsToggle: () => void;
  settingsButtonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-2 border border-transparent bg-[var(--color-sidebar-panel)] px-3.5 py-3 text-sm font-medium shadow-[var(--shadow-whisper)]">
      <Link
        className="flex min-w-0 flex-1 items-center gap-3 transition hover:text-[var(--color-foreground)]"
        href="/home"
      >
        <House className="size-4 text-[var(--color-muted-foreground)]" />
        {t("home")}
      </Link>
      {canManageCurrentWorkspace ? (
        <>
          <button
            className="flex size-8 items-center justify-center text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
            title={t("newDocument")}
            onClick={onCreateDocument}
            type="button"
          >
            <Plus className="size-4" />
          </button>
          <button
            className="flex size-8 items-center justify-center text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
            ref={settingsButtonRef}
            title={t("workspaceSettings")}
            onClick={onSettingsToggle}
            type="button"
          >
            <Settings2 className="size-4" />
          </button>
        </>
      ) : null}
      <span className="sr-only">{currentWorkspace.name}</span>
    </div>
  );
}

export function ShellSidebarSections({
  buckets,
  canManageCurrentWorkspace,
  currentWorkspace,
  deleteConfirmName,
  handleOpenDocument,
  isWorking,
  onCreateDocument,
  onDeleteConfirmNameChange,
  onDeleteWorkspace,
  onRenameWorkspace,
  onRenameWorkspaceNameChange,
  onSettingsToggle,
  onTrashOpen,
  renameWorkspaceName,
  settingsButtonRef,
  showWorkspaceSettings,
  workspaceSettingsPopoverRef,
}: ShellSidebarSectionsProps) {
  const { t } = useLocale();
  return (
    <>
      <nav className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
        <div className="relative">
          <HomeRow
            canManageCurrentWorkspace={canManageCurrentWorkspace}
            currentWorkspace={currentWorkspace}
            onCreateDocument={onCreateDocument}
            onSettingsToggle={onSettingsToggle}
            settingsButtonRef={settingsButtonRef}
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
          <SidebarSection
            items={buckets.recents}
            kind="recents"
            onOpenItem={handleOpenDocument}
            title={t("recents")}
          />
          <SidebarSection
            items={buckets.shared}
            kind="shared"
            onOpenItem={handleOpenDocument}
            title={t("shared")}
          />
          {canManageCurrentWorkspace ? (
            <SidebarSection
              items={buckets.privateDocs}
              kind="private"
              onCreate={onCreateDocument}
              onOpenItem={handleOpenDocument}
              title={t("private")}
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
            {t("trash")}
          </div>
        </button>
      ) : null}
    </>
  );
}
