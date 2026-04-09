"use client";

import type { FormEvent, RefObject } from "react";
import { getMessage, type Locale } from "@/lib/i18n/messages";
import { EditorPermissionDropdown } from "@/features/editor/components/editor-permission-dropdown";
import { EditorPermissionPopover } from "@/features/editor/components/editor-permission-popover";
import type { AccessEntry } from "@/features/editor/lib/types";

type EditorHeaderPermissionActionProps = {
  accessEntries: AccessEntry[];
  canManageAccess: boolean;
  currentUserId: string | null | undefined;
  documentId: string;
  documentStatus: "private" | "shared" | "trashed";
  guestBadgeClass: string;
  locale: Locale;
  onCloseOtherMenus: () => void;
  permissionBusy: boolean;
  permissionButtonRef: RefObject<HTMLButtonElement | null>;
  permissionError: string | null;
  permissionLabel: (permission: "owner" | "can_edit" | "can_view") => string;
  permissionMenuOpen: boolean;
  permissionMenuRef: RefObject<HTMLDivElement | null>;
  permissionNotice: string | null;
  removeDocumentAccess: (
    documentId: string,
    userId: string,
  ) => Promise<{ error: string; ok: false } | { ok: true }>;
  setPermissionBusy: (value: boolean) => void;
  setPermissionError: (value: string | null) => void;
  setPermissionMenuOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setPermissionNotice: (value: string | null) => void;
  setShareEmail: (value: string) => void;
  setSharePermission: (value: "can_edit" | "can_view") => void;
  shareDocument: (
    documentId: string,
    payload: { email: string; permission: "can_edit" | "can_view" },
  ) => Promise<{ error: string; ok: false } | { ok: true }>;
  shareEmail: string;
  sharePermission: "can_edit" | "can_view";
  updateDocumentAccess: (
    documentId: string,
    userId: string,
    permission: "can_edit" | "can_view",
  ) => Promise<{ error: string; ok: false } | { ok: true }>;
};

function t(locale: Locale, key: Parameters<typeof getMessage>[1]) {
  return getMessage(locale, key);
}

async function updateAccess(
  documentId: string,
  userId: string,
  nextPermission: "can_edit" | "can_view",
  props: Pick<
    EditorHeaderPermissionActionProps,
    | "setPermissionBusy"
    | "setPermissionError"
    | "setPermissionNotice"
    | "locale"
    | "updateDocumentAccess"
  >,
) {
  props.setPermissionBusy(true);
  props.setPermissionError(null);
  props.setPermissionNotice(null);
  const result = await props.updateDocumentAccess(documentId, userId, nextPermission);
  props.setPermissionBusy(false);
  if (!result.ok) {
    props.setPermissionError(result.error);
    return;
  }
  props.setPermissionNotice(t(props.locale, "permissionUpdated"));
}

async function removeAccess(
  documentId: string,
  userId: string,
  props: Pick<
    EditorHeaderPermissionActionProps,
    | "removeDocumentAccess"
    | "setPermissionBusy"
    | "setPermissionError"
    | "setPermissionNotice"
    | "locale"
  >,
) {
  props.setPermissionBusy(true);
  props.setPermissionError(null);
  props.setPermissionNotice(null);
  const result = await props.removeDocumentAccess(documentId, userId);
  props.setPermissionBusy(false);
  if (!result.ok) {
    props.setPermissionError(result.error);
    return;
  }
  props.setPermissionNotice(t(props.locale, "accessRemoved"));
}

async function submitShare(
  event: FormEvent<HTMLFormElement>,
  props: Pick<
    EditorHeaderPermissionActionProps,
    | "documentId"
    | "setPermissionBusy"
    | "setPermissionError"
    | "setPermissionNotice"
    | "setShareEmail"
    | "setSharePermission"
    | "locale"
    | "shareDocument"
    | "shareEmail"
    | "sharePermission"
  >,
) {
  event.preventDefault();
  props.setPermissionBusy(true);
  props.setPermissionError(null);
  props.setPermissionNotice(null);
  const result = await props.shareDocument(props.documentId, {
    email: props.shareEmail,
    permission: props.sharePermission,
  });
  props.setPermissionBusy(false);
  if (!result.ok) {
    props.setPermissionError(result.error);
    return;
  }
  props.setShareEmail("");
  props.setSharePermission("can_view");
  props.setPermissionNotice(t(props.locale, "guestAdded"));
}

export function EditorHeaderPermissionAction(
  props: EditorHeaderPermissionActionProps,
) {
  return (
    <EditorPermissionPopover
      accessEntries={props.accessEntries}
      canManageAccess={props.canManageAccess}
      currentUserId={props.currentUserId}
      documentStatus={props.documentStatus}
      guestBadgeClass={props.guestBadgeClass}
      onCloseOtherMenus={props.onCloseOtherMenus}
      onPermissionMenuToggle={props.setPermissionMenuOpen}
      onRemoveAccess={(userId) => removeAccess(props.documentId, userId, props)}
      onShareEmailChange={props.setShareEmail}
      onSharePermissionChange={props.setSharePermission}
      onShareSubmit={(event) => submitShare(event, props)}
      onUpdateAccess={(userId, nextPermission) =>
        updateAccess(props.documentId, userId, nextPermission, props)
      }
      permissionBusy={props.permissionBusy}
      permissionButtonRef={props.permissionButtonRef}
      permissionError={props.permissionError}
      permissionLabel={props.permissionLabel}
      permissionMenuOpen={props.permissionMenuOpen}
      permissionMenuRef={props.permissionMenuRef}
      permissionNotice={props.permissionNotice}
      PermissionDropdown={EditorPermissionDropdown}
      setPermissionError={props.setPermissionError}
      setPermissionNotice={props.setPermissionNotice}
      shareEmail={props.shareEmail}
      sharePermission={props.sharePermission}
    />
  );
}
