"use client";

import { ChevronDown, Lock, X } from "lucide-react";
import type { RefObject } from "react";

type AccessEntry = {
  email: string;
  id: string;
  name: string;
  permission: "owner" | "can_edit" | "can_view";
  userId: string;
};

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
      <button
        className="flex min-h-10 items-center gap-2 border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-hover)]"
        onClick={() => {
          onPermissionMenuToggle((current) => !current);
          setPermissionError(null);
          setPermissionNotice(null);
          onCloseOtherMenus();
        }}
        ref={permissionButtonRef}
        type="button"
      >
        {documentStatus === "private" ? (
          <>
            <Lock className="size-4 text-[var(--color-muted-foreground)]" />
            <span>Private</span>
          </>
        ) : (
          <>
            <span>Shared</span>
            <div className="flex items-center -space-x-1">
              {sharedAvatars.map((entry) => (
                <span
                  className="flex size-6 items-center justify-center rounded-full border border-white bg-[var(--color-sidebar-panel)] text-[11px] font-semibold text-[var(--color-muted-foreground)]"
                  key={entry.id}
                  title={entry.name}
                >
                  {entry.name.slice(0, 1).toUpperCase()}
                </span>
              ))}
            </div>
          </>
        )}
        <ChevronDown
          className={`size-4 text-[var(--color-muted-foreground)] transition ${
            permissionMenuOpen ? "rotate-180" : ""
          }`}
        />
      </button>

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
              <form
                className="space-y-3 border-b border-[var(--color-border)] pb-4"
                onSubmit={(event) => {
                  void onShareSubmit(event);
                }}
              >
                <div className="flex items-center gap-3">
                  <input
                    className="h-10 min-w-0 flex-1 border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-ring)_15%,transparent)]"
                    onChange={(event) => {
                      onShareEmailChange(event.target.value);
                    }}
                    placeholder="Email"
                    spellCheck={false}
                    type="email"
                    value={shareEmail}
                  />
                  <PermissionDropdown
                    onSelect={onSharePermissionChange}
                    value={sharePermission}
                    widthClassName="w-[108px]"
                  />
                  <button
                    className="h-9 shrink-0 bg-[var(--color-primary)] px-3 text-xs font-semibold text-[var(--color-primary-foreground)] transition hover:brightness-95 disabled:opacity-50"
                    disabled={permissionBusy}
                    type="submit"
                  >
                    Share
                  </button>
                </div>
              </form>
            ) : null}

            <div className={`${canManageAccess ? "mt-4" : ""} space-y-1`}>
              {accessEntries.map((entry) => {
                const isOwnerEntry = entry.permission === "owner";
                const isCurrentUser = currentUserId === entry.userId;
                const editablePermission =
                  entry.permission === "can_edit" ? "can_edit" : "can_view";

                return (
                  <div
                    className="flex items-center gap-3 px-1.5 py-2"
                    key={entry.id}
                  >
                    <span className="flex size-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] text-sm font-medium text-[var(--color-muted-foreground)]">
                      {entry.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{entry.name}</p>
                        {!isOwnerEntry ? (
                          <span className={guestBadgeClass}>Guest</span>
                        ) : null}
                        {isCurrentUser ? (
                          <span className="text-sm text-[var(--color-muted-foreground)]">
                            (You)
                          </span>
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
              })}
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
