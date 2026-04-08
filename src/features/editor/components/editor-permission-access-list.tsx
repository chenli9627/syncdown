"use client";

import { X } from "lucide-react";
import type { AccessEntry } from "@/features/editor/lib/types";

type EditorPermissionAccessListProps = {
  accessEntries: AccessEntry[];
  canManageAccess: boolean;
  currentUserId: string | null | undefined;
  guestBadgeClass: string;
  onRemoveAccess: (userId: string) => Promise<void>;
  onUpdateAccess: (userId: string, permission: "can_edit" | "can_view") => Promise<void>;
  permissionBusy: boolean;
  permissionLabel: (permission: "owner" | "can_edit" | "can_view") => string;
  PermissionDropdown: React.ComponentType<{
    align?: "left" | "right";
    disabled?: boolean;
    onSelect: (value: "can_edit" | "can_view") => void;
    value: "can_edit" | "can_view";
    widthClassName?: string;
  }>;
};

export function EditorPermissionAccessList({
  accessEntries,
  canManageAccess,
  currentUserId,
  guestBadgeClass,
  onRemoveAccess,
  onUpdateAccess,
  permissionBusy,
  permissionLabel,
  PermissionDropdown,
}: EditorPermissionAccessListProps) {
  return (
    <div className="space-y-1">
      {accessEntries.map((entry) => (
        <EditorPermissionAccessRow
          canManageAccess={canManageAccess}
          currentUserId={currentUserId}
          entry={entry}
          guestBadgeClass={guestBadgeClass}
          key={entry.id}
          onRemoveAccess={onRemoveAccess}
          onUpdateAccess={onUpdateAccess}
          permissionBusy={permissionBusy}
          permissionLabel={permissionLabel}
          PermissionDropdown={PermissionDropdown}
        />
      ))}
    </div>
  );
}

type EditorPermissionAccessRowProps = Omit<
  EditorPermissionAccessListProps,
  "accessEntries"
> & {
  entry: AccessEntry;
};

function EditorPermissionAccessRow({
  canManageAccess,
  currentUserId,
  entry,
  guestBadgeClass,
  onRemoveAccess,
  onUpdateAccess,
  permissionBusy,
  permissionLabel,
  PermissionDropdown,
}: EditorPermissionAccessRowProps) {
  const isOwnerEntry = entry.permission === "owner";
  const isCurrentUser = currentUserId === entry.userId;
  const editablePermission = entry.permission === "can_edit" ? "can_edit" : "can_view";

  return (
    <div className="flex items-center gap-3 px-1.5 py-2">
      <span className="flex size-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] text-sm font-medium text-[var(--color-muted-foreground)]">
        {entry.name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{entry.name}</p>
          {!isOwnerEntry ? <span className={guestBadgeClass}>Guest</span> : null}
          {isCurrentUser ? (
            <span className="text-sm text-[var(--color-muted-foreground)]">(You)</span>
          ) : null}
        </div>
        <p className="truncate text-sm text-[var(--color-muted-foreground)]">
          {entry.email}
        </p>
      </div>
      {canManageAccess && !isOwnerEntry ? (
        <div className="flex items-center gap-2">
          <PermissionDropdown
            align="right"
            disabled={permissionBusy}
            onSelect={(nextPermission) => {
              void onUpdateAccess(entry.userId, nextPermission);
            }}
            value={editablePermission}
            widthClassName="w-[108px]"
          />
          <button
            className="flex size-8 items-center justify-center text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[#b44c07]"
            onClick={() => {
              void onRemoveAccess(entry.userId);
            }}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <span className="text-sm text-[var(--color-muted-foreground)]">
          {isOwnerEntry ? "Owner" : permissionLabel(entry.permission)}
        </span>
      )}
    </div>
  );
}
