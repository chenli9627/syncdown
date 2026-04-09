"use client";

import { useLocale } from "@/components/providers/locale-provider";

type WorkspaceSettingsPopoverProps = {
  currentWorkspaceName: string;
  deleteConfirmName: string;
  isWorking: boolean;
  onDeleteConfirmNameChange: (value: string) => void;
  onDeleteWorkspace: () => Promise<void>;
  onRenameWorkspace: () => Promise<void>;
  onRenameWorkspaceNameChange: (value: string) => void;
  renameWorkspaceName: string;
  workspaceSettingsPopoverRef: React.RefObject<HTMLDivElement | null>;
};

export function WorkspaceSettingsPopover({
  currentWorkspaceName,
  deleteConfirmName,
  isWorking,
  onDeleteConfirmNameChange,
  onDeleteWorkspace,
  onRenameWorkspace,
  onRenameWorkspaceNameChange,
  renameWorkspaceName,
  workspaceSettingsPopoverRef,
}: WorkspaceSettingsPopoverProps) {
  const { t } = useLocale();
  return (
    <div
      className="absolute left-[calc(100%+8px)] top-0 z-[85] w-[296px] space-y-4 border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-soft-card)]"
      ref={workspaceSettingsPopoverRef}
    >
      <form
        className="space-y-2"
        onSubmit={async (event) => {
          event.preventDefault();
          await onRenameWorkspace();
        }}
      >
        <label
          className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]"
          htmlFor="rename-workspace"
        >
          {t("renameWorkspace")}
        </label>
        <input
          className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none"
          id="rename-workspace"
          name="rename-workspace"
          onChange={(event) => {
            onRenameWorkspaceNameChange(event.target.value);
          }}
          value={renameWorkspaceName}
        />
        <div className="flex justify-end">
          <button
            className="rounded-[4px] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:brightness-95"
            disabled={isWorking}
            type="submit"
          >
            {t("saveChanges")}
          </button>
        </div>
      </form>

      <form
        className="space-y-2 border-t border-[var(--color-border)] pt-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await onDeleteWorkspace();
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          {t("deleteWorkspace")}
        </p>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t("deleteWorkspaceDescription")}{" "}
          <span className="font-semibold text-[var(--color-foreground)]">
            {currentWorkspaceName}
          </span>{" "}
          {t("deleteWorkspaceDescriptionSuffix")}
        </p>
        <input
          className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none"
          name="delete-workspace-confirmation"
          onChange={(event) => {
            onDeleteConfirmNameChange(event.target.value);
          }}
          placeholder={currentWorkspaceName}
          value={deleteConfirmName}
        />
        <div className="flex justify-end">
          <button
            className="rounded-[4px] bg-[#dd5b00] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            disabled={isWorking}
            type="submit"
          >
            {t("deleteWorkspacePermanently")}
          </button>
        </div>
      </form>
    </div>
  );
}
