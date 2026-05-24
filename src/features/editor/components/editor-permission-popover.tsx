"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/components/providers/locale-provider";
import { AppErrorDialog } from "@/components/ui/app-error-dialog";
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
};

type PermissionMenuPosition = {
  left: number;
  top: number;
  width: number;
};

const permissionMenuWidth = 468;
const permissionMenuViewportPadding = 12;

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
}: EditorPermissionPopoverProps) {
  const { t } = useLocale();
  const [menuPosition, setMenuPosition] = useState<PermissionMenuPosition | null>(null);

  useEffect(() => {
    if (!permissionMenuOpen) {
      return;
    }

    let frameId: number | null = null;

    const syncPosition = () => {
      const button = permissionButtonRef.current;

      if (!button) {
        return;
      }

      const buttonRect = button.getBoundingClientRect();
      const mainRect = button.closest("main")?.getBoundingClientRect();
      const minLeft = (mainRect?.left ?? 0) + permissionMenuViewportPadding;
      const maxWidth = Math.max(
        280,
        window.innerWidth - minLeft - permissionMenuViewportPadding,
      );
      const width = Math.min(permissionMenuWidth, maxWidth);
      const maxLeft = window.innerWidth - width - permissionMenuViewportPadding;
      const left = Math.min(Math.max(buttonRect.right - width, minLeft), maxLeft);

      setMenuPosition({
        left,
        top: buttonRect.bottom + 10,
        width,
      });
    };
    const scheduleSyncPosition = () => {
      if (frameId != null) {
        cancelAnimationFrame(frameId);
      }

      frameId = requestAnimationFrame(() => {
        frameId = null;
        syncPosition();
      });
    };

    scheduleSyncPosition();
    window.addEventListener("resize", scheduleSyncPosition);
    window.addEventListener("scroll", scheduleSyncPosition, true);

    return () => {
      if (frameId != null) {
        cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", scheduleSyncPosition);
      window.removeEventListener("scroll", scheduleSyncPosition, true);
    };
  }, [permissionButtonRef, permissionMenuOpen]);

  const permissionMenu =
    permissionMenuOpen && menuPosition
      ? createPortal(
          <div
            className="fixed z-[70] overflow-visible border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft-card)]"
            ref={permissionMenuRef}
            style={{
              left: menuPosition.left,
              top: menuPosition.top,
              width: menuPosition.width,
            }}
          >
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <p className="text-[15px] font-semibold text-[var(--color-foreground)]">
                {t("share")}
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

              {permissionNotice ? (
                <p className="pt-1 text-sm text-[var(--color-muted-foreground)]">
                  {permissionNotice}
                </p>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null;

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
      />

      {permissionMenu}
      <AppErrorDialog
        error={permissionError}
        onClose={() => setPermissionError(null)}
        title={t("permissionUpdateFailed")}
      />
    </div>
  );
}
