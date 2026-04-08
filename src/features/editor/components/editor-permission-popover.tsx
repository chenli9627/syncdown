"use client";

import type { RefObject } from "react";
import { EditorPermissionAccessList } from "@/features/editor/components/editor-permission-access-list";
import { EditorPermissionShareForm } from "@/features/editor/components/editor-permission-share-form";
import { EditorPermissionTrigger } from "@/features/editor/components/editor-permission-trigger";
import type { AccessEntry } from "@/features/editor/lib/types";

type EditorPermissionPopoverProps = {
  accessEntries: AccessEntry[];
  canManageAccess: boolean;
  currentUserId: string | null | undefined;
  documentStatus: "private" | "shared" | "trashed";
  guestBadgeClass: string;
  onCloseOtherMenus: () => void;
  onPermissionMenuToggle: (value: boolean | ((current: boolean) => boolean)) => void;
  onRemoveAccess: (userId: string) => Promise<void>;
  onShareEmailChange: (value: string) => void;
  onSharePermissionChange: (value: "can_edit" | "can_view") => void;
  onShareSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onUpdateAccess: (userId: string, permission: "can_edit" | "can_view") => Promise<void>;
  permissionBusy: boolean;
  permissionButtonRef: RefObject<HTMLButtonElement | null>;
  permissionError: string | null;
  permissionLabel: (permission: "owner" | "can_edit" | "can_view") => string;
  permissionMenuOpen: boolean;
  permissionMenuRef: RefObject<HTMLDivElement | null>;
  permissionNotice: string | null;
  PermissionDropdown: React.ComponentType<{
    align?: "left" | "right";
    disabled?: boolean;
    onSelect: (value: "can_edit" | "can_view") => void;
    value: "can_edit" | "can_view";
    widthClassName?: string;
  }>;
  setPermissionError: (value: string | null) => void;
  setPermissionNotice: (value: string | null) => void;
  shareEmail: string;
  sharePermission: "can_edit" | "can_view";
  sharedAvatars: Array<{ id: string; name: string }>;
};

export function EditorPermissionPopover({
  accessEntries,
  canManageAccess,
  currentUserId,
  documentStatus,
  guestBadgeClass,
  onCloseOtherMenus,
  onPermissionMenuToggle,
  onRemoveAccess,
  onShareEmailChange,
  onSharePermissionChange,
  onShareSubmit,
  onUpdateAccess,
  permissionBusy,
  permissionButtonRef,
  permissionError,
  permissionLabel,
  permissionMenuOpen,
  permissionMenuRef,
  permissionNotice,
  PermissionDropdown,
  setPermissionError,
  setPermissionNotice,
  shareEmail,
  sharePermission,
  sharedAvatars,
}: EditorPermissionPopoverProps) {
  return (
    <div className="relative">
      <EditorPermissionTrigger
        documentStatus={documentStatus}
        onClick={() => {
          onPermissionMenuToggle((current) => !current);
          setPermissionError(null);
          setPermissionNotice(null);
          onCloseOtherMenus();
        }}
        permissionButtonRef={permissionButtonRef}
        permissionMenuOpen={permissionMenuOpen}
        sharedAvatars={sharedAvatars}
      />

      {permissionMenuOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+10px)] z-20 w-[468px] overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft-card)]"
          ref={permissionMenuRef}
        >
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <p className="text-[15px] font-semibold text-[var(--color-foreground)]">
              Share
            </p>
          </div>

          <div className="px-4 py-4">
            {canManageAccess ? (
              <EditorPermissionShareForm
                onShareEmailChange={onShareEmailChange}
                onSharePermissionChange={onSharePermissionChange}
                onShareSubmit={onShareSubmit}
                permissionBusy={permissionBusy}
                PermissionDropdown={PermissionDropdown}
                shareEmail={shareEmail}
                sharePermission={sharePermission}
              />
            ) : null}

            <div className={canManageAccess ? "mt-4" : ""}>
              <EditorPermissionAccessList
                accessEntries={accessEntries}
                canManageAccess={canManageAccess}
                currentUserId={currentUserId}
                guestBadgeClass={guestBadgeClass}
                onRemoveAccess={onRemoveAccess}
                onUpdateAccess={onUpdateAccess}
                permissionBusy={permissionBusy}
                permissionLabel={permissionLabel}
                PermissionDropdown={PermissionDropdown}
              />
            </div>

            {permissionError ? (
              <p className="pt-1 text-sm text-[#dd5b00]">{permissionError}</p>
            ) : null}
            {permissionNotice ? (
              <p className="pt-1 text-sm text-[var(--color-muted-foreground)]">
                {permissionNotice}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
