"use client";

import type { Editor } from "@tiptap/react";
import type { RefObject } from "react";
import {
  EditorHeaderActions,
  type EditorHeaderActionsProps,
} from "@/features/editor/components/editor-header-actions";
import {
  EditorHeaderTitle,
  type EditorHeaderTitleProps,
} from "@/features/editor/components/editor-header-title";
import type { AccessEntry, PresenceParticipant } from "@/features/editor/lib/types";

type EditorHeaderProps = {
  accessEntries: AccessEntry[];
  actionError: string | null;
  actionNotice: string | null;
  canEditBody: boolean;
  canEditTitle: boolean;
  canManageAccess: boolean;
  canUndo: boolean;
  commitTitle: () => Promise<void>;
  currentUserId: string | null | undefined;
  documentId: string;
  documentStatus: "private" | "shared" | "trashed";
  editor: Editor | null;
  guestBadgeClass: string;
  handleExportMarkdown: () => Promise<void>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  importInputRef: RefObject<HTMLInputElement | null>;
  moveDocumentToTrash: (documentId: string) => Promise<{ error: string; ok: false } | { ok: true }>;
  onSearchNext: () => void;
  onSearchPrevious: () => void;
  overflowButtonRef: RefObject<HTMLButtonElement | null>;
  overflowMenuOpen: boolean;
  overflowMenuRef: RefObject<HTMLDivElement | null>;
  permission: "owner" | "can_edit" | "can_view";
  permissionBoldLabel: (permission: "owner" | "can_edit" | "can_view") => string;
  permissionBusy: boolean;
  permissionButtonRef: RefObject<HTMLButtonElement | null>;
  permissionError: string | null;
  permissionMenuOpen: boolean;
  permissionMenuRef: RefObject<HTMLDivElement | null>;
  permissionNotice: string | null;
  remoteParticipants: PresenceParticipant[];
  removeDocumentAccess: (
    documentId: string,
    userId: string,
  ) => Promise<{ error: string; ok: false } | { ok: true }>;
  routerPushHome: () => void;
  searchButtonRef: RefObject<HTMLButtonElement | null>;
  searchHeaderLabel: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchMenuOpen: boolean;
  searchMenuRef: RefObject<HTMLDivElement | null>;
  searchNotice: string | null;
  searchQuery: string;
  setActionError: (value: string | null) => void;
  setActionNotice: (value: string | null) => void;
  setOverflowMenuOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setPermissionBusy: (value: boolean) => void;
  setPermissionError: (value: string | null) => void;
  setPermissionMenuOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setPermissionNotice: (value: string | null) => void;
  setSearchMatchCount: (value: number) => void;
  setSearchMatchIndex: (value: number) => void;
  setSearchMenuOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setSearchNotice: (value: string | null) => void;
  setSearchQuery: (value: string) => void;
  setSearchRects: (value: []) => void;
  setShareEmail: (value: string) => void;
  setSharePermission: (value: "can_edit" | "can_view") => void;
  setTitleDraft: (value: string) => void;
  shareDocument: (
    documentId: string,
    payload: { email: string; permission: "can_edit" | "can_view" },
  ) => Promise<{ error: string; ok: false } | { ok: true }>;
  shareEmail: string;
  sharePermission: "can_edit" | "can_view";
  statusLabel: string | null;
  titleDraft: string;
  titleError: string | null;
  titleInputRef: RefObject<HTMLInputElement | null>;
  updateDocumentAccess: (
    documentId: string,
    userId: string,
    permission: "can_edit" | "can_view",
  ) => Promise<{ error: string; ok: false } | { ok: true }>;
};

export function EditorHeader({
  accessEntries,
  actionError,
  actionNotice,
  canEditBody,
  canEditTitle,
  canManageAccess,
  canUndo,
  commitTitle,
  currentUserId,
  documentId,
  documentStatus,
  editor,
  guestBadgeClass,
  handleExportMarkdown,
  imageInputRef,
  importInputRef,
  moveDocumentToTrash,
  onSearchNext,
  onSearchPrevious,
  overflowButtonRef,
  overflowMenuOpen,
  overflowMenuRef,
  permission,
  permissionBoldLabel,
  permissionBusy,
  permissionButtonRef,
  permissionError,
  permissionMenuOpen,
  permissionMenuRef,
  permissionNotice,
  remoteParticipants,
  removeDocumentAccess,
  routerPushHome,
  searchButtonRef,
  searchHeaderLabel,
  searchInputRef,
  searchMenuOpen,
  searchMenuRef,
  searchNotice,
  searchQuery,
  setActionError,
  setActionNotice,
  setOverflowMenuOpen,
  setPermissionBusy,
  setPermissionError,
  setPermissionMenuOpen,
  setPermissionNotice,
  setSearchMatchCount,
  setSearchMatchIndex,
  setSearchMenuOpen,
  setSearchNotice,
  setSearchQuery,
  setSearchRects,
  setShareEmail,
  setSharePermission,
  setTitleDraft,
  shareDocument,
  shareEmail,
  sharePermission,
  statusLabel,
  titleDraft,
  titleError,
  titleInputRef,
  updateDocumentAccess,
}: EditorHeaderProps) {
  const titleProps: EditorHeaderTitleProps = {
    canEditTitle,
    commitTitle,
    editor,
    setTitleDraft,
    statusLabel,
    titleDraft,
    titleInputRef,
  };
  const actionsProps: EditorHeaderActionsProps = {
    accessEntries,
    actionError,
    actionNotice,
    canEditBody,
    canManageAccess,
    canUndo,
    currentUserId,
    documentId,
    documentStatus,
    editor,
    guestBadgeClass,
    handleExportMarkdown,
    imageInputRef,
    importInputRef,
    moveDocumentToTrash,
    onSearchNext,
    onSearchPrevious,
    overflowButtonRef,
    overflowMenuOpen,
    overflowMenuRef,
    permission,
    permissionBoldLabel,
    permissionBusy,
    permissionButtonRef,
    permissionError,
    permissionMenuOpen,
    permissionMenuRef,
    permissionNotice,
    remoteParticipants,
    removeDocumentAccess,
    routerPushHome,
    searchButtonRef,
    searchHeaderLabel,
    searchInputRef,
    searchMenuOpen,
    searchMenuRef,
    searchNotice,
    searchQuery,
    setActionError,
    setActionNotice,
    setOverflowMenuOpen,
    setPermissionBusy,
    setPermissionError,
    setPermissionMenuOpen,
    setPermissionNotice,
    setSearchMatchCount,
    setSearchMatchIndex,
    setSearchMenuOpen,
    setSearchNotice,
    setSearchQuery,
    setSearchRects,
    setShareEmail,
    setSharePermission,
    shareDocument,
    shareEmail,
    sharePermission,
    updateDocumentAccess,
  };

  return (
    <div className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-editor-header-background)] px-4 py-2 backdrop-blur-md">
      <div className="flex w-full flex-col">
        <div className="flex items-start justify-between gap-6">
          <EditorHeaderTitle {...titleProps} />
          <EditorHeaderActions {...actionsProps} />
        </div>
        {titleError ? (
          <p className="mt-1 text-[11px] text-[#dd5b00]">{titleError}</p>
        ) : null}
      </div>
    </div>
  );
}
