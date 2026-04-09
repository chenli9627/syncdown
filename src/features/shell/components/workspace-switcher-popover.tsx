"use client";

import { Plus } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import type { User, Workspace } from "@/features/app-state/types";
import { translateAppError } from "@/lib/i18n/error-messages";

type WorkspaceSwitcherPopoverProps = {
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
  workspaceMenuRef: React.RefObject<HTMLDivElement | null>;
  workspaceName: string;
  workspaceNotice: string | null;
};

export function WorkspaceSwitcherPopover({
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
  workspaceMenuRef,
  workspaceName,
  workspaceNotice,
}: WorkspaceSwitcherPopoverProps) {
  const { locale, t } = useLocale();
  return (
    <div
      className="absolute left-0 top-[calc(100%+8px)] z-[80] w-full border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-soft-card)]"
      ref={workspaceMenuRef}
    >
      <div className="max-h-60 overflow-y-auto">
        {accessibleWorkspaces.map((workspace) => (
          <button
            className="flex w-full items-center justify-between px-2 py-2 text-left text-sm transition hover:bg-[var(--color-hover)]"
            key={workspace.id}
            onClick={() => {
              onSelectWorkspace(workspace.id);
              onClose();
            }}
            type="button"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate">{workspace.name}</span>
              {workspace.ownerUserId !== currentUser.id ? (
                <span className={guestBadgeClass}>
                  {t("guest")}
                </span>
              ) : null}
            </div>
            <div className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
              {workspace.id === currentWorkspaceId ? t("current") : ""}
            </div>
          </button>
        ))}
      </div>
      {workspaceError ? (
        <p className="mt-3 text-sm text-[#dd5b00]">
          {translateAppError(workspaceError, t, locale) ?? workspaceError}
        </p>
      ) : null}
      {workspaceNotice ? (
        <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
          {workspaceNotice}
        </p>
      ) : null}
      <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3">
        <div className="space-y-2">
          <div className="relative">
            <button
              className="flex w-full items-center justify-between border border-transparent px-2 py-2 text-left text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
              ref={createWorkspaceButtonRef}
              onClick={() => {
                setWorkspaceName("");
                onShowCreateWorkspaceChange((current) => !current);
                setWorkspaceError(null);
                setWorkspaceNotice(null);
              }}
              type="button"
            >
              <span>{t("createWorkspace")}</span>
              <Plus className="size-4" />
            </button>

            {showCreateWorkspace ? (
              <form
                className="absolute left-[calc(100%+8px)] top-1/2 z-[90] w-[272px] -translate-y-1/2 space-y-2 border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-soft-card)]"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await onCreateWorkspace();
                }}
                ref={createWorkspacePopoverRef}
              >
                <label
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]"
                  htmlFor="workspace-name"
                >
                  {t("newWorkspace")}
                </label>
                <input
                  className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none"
                  id="workspace-name"
                  name="workspace-name"
                  onChange={(event) => {
                    setWorkspaceName(event.target.value);
                  }}
                  placeholder={t("workspaceName")}
                  value={workspaceName}
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    className="rounded-[4px] px-3 py-2 text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
                    onClick={() => {
                      onShowCreateWorkspaceChange(false);
                      setWorkspaceName("");
                    }}
                    type="button"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    className="rounded-[4px] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:brightness-95"
                    disabled={isWorking}
                    type="submit"
                  >
                    {t("create")}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
        <button
          className="flex w-full items-center justify-between border border-transparent px-2 py-2 text-left text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
          onClick={onOpenSettings}
          type="button"
        >
          <span>{t("settings")}</span>
        </button>
        <button
          className="flex w-full items-center justify-between border border-transparent px-2 py-2 text-left text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
          onClick={onLogout}
          type="button"
        >
          <span>{t("logOut")}</span>
        </button>
      </div>
    </div>
  );
}
