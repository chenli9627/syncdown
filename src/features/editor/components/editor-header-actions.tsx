"use client";

import type { Editor } from "@tiptap/react";
import type { RefObject } from "react";
import { EditorHeaderOverflowAction } from "@/features/editor/components/editor-header-overflow-action";
import { EditorHeaderPermissionAction } from "@/features/editor/components/editor-header-permission-action";
import { EditorHeaderSearchAction } from "@/features/editor/components/editor-header-search-action";
import type { AccessEntry } from "@/features/editor/lib/types";

type EditorHeaderActionsProps = {
  accessEntries: AccessEntry[];
  actionError: string | null;
  actionNotice: string | null;
  canEditBody: boolean;
  canManageAccess: boolean;
  canUndo: boolean;
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
  shareDocument: (
    documentId: string,
    payload: { email: string; permission: "can_edit" | "can_view" },
  ) => Promise<{ error: string; ok: false } | { ok: true }>;
  shareEmail: string;
  sharePermission: "can_edit" | "can_view";
  sharedAvatars: Array<{ id: string; name: string }>;
  updateDocumentAccess: (
    documentId: string,
    userId: string,
    permission: "can_edit" | "can_view",
  ) => Promise<{ error: string; ok: false } | { ok: true }>;
};

export type { EditorHeaderActionsProps };

export function EditorHeaderActions({
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
  sharedAvatars,
  updateDocumentAccess,
}: EditorHeaderActionsProps) {
  return (
    <div className="flex items-center gap-1.5">
      <EditorHeaderPermissionAction
        accessEntries={accessEntries}
        canManageAccess={canManageAccess}
        currentUserId={currentUserId}
        documentId={documentId}
        documentStatus={documentStatus}
        guestBadgeClass={guestBadgeClass}
        onCloseOtherMenus={() => {
          setActionError(null);
          setActionNotice(null);
          setSearchMenuOpen(false);
          setOverflowMenuOpen(false);
        }}
        permissionBusy={permissionBusy}
        permissionButtonRef={permissionButtonRef}
        permissionError={permissionError}
        permissionLabel={permissionBoldLabel}
        permissionMenuOpen={permissionMenuOpen}
        permissionMenuRef={permissionMenuRef}
        permissionNotice={permissionNotice}
        removeDocumentAccess={removeDocumentAccess}
        setPermissionError={setPermissionError}
        setPermissionBusy={setPermissionBusy}
        setPermissionMenuOpen={setPermissionMenuOpen}
        setPermissionNotice={setPermissionNotice}
        setShareEmail={setShareEmail}
        setSharePermission={setSharePermission}
        shareDocument={shareDocument}
        shareEmail={shareEmail}
        sharePermission={sharePermission}
        sharedAvatars={sharedAvatars}
        updateDocumentAccess={updateDocumentAccess}
      />

      <EditorHeaderSearchAction
        onCloseOtherMenus={() => {
          setActionError(null);
          setActionNotice(null);
          setOverflowMenuOpen(false);
          setPermissionMenuOpen(false);
        }}
        onNext={onSearchNext}
        onPrevious={onSearchPrevious}
        searchButtonRef={searchButtonRef}
        searchHeaderLabel={searchHeaderLabel}
        searchInputRef={searchInputRef}
        searchMenuOpen={searchMenuOpen}
        searchMenuRef={searchMenuRef}
        searchNotice={searchNotice}
        searchQuery={searchQuery}
        setOpen={setSearchMenuOpen}
        setSearchMatchCount={setSearchMatchCount}
        setSearchMatchIndex={setSearchMatchIndex}
        setSearchNotice={setSearchNotice}
        setSearchQuery={setSearchQuery}
        setSearchRects={setSearchRects}
      />

      <EditorHeaderOverflowAction
        actionError={actionError}
        actionNotice={actionNotice}
        canEditBody={canEditBody}
        canUndo={canUndo}
        documentId={documentId}
        editor={editor}
        handleExportMarkdown={handleExportMarkdown}
        imageInputRef={imageInputRef}
        importInputRef={importInputRef}
        moveDocumentToTrash={moveDocumentToTrash}
        overflowButtonRef={overflowButtonRef}
        overflowMenuOpen={overflowMenuOpen}
        overflowMenuRef={overflowMenuRef}
        permission={permission}
        routerPushHome={routerPushHome}
        setActionError={setActionError}
        setActionNotice={setActionNotice}
        setOverflowMenuOpen={setOverflowMenuOpen}
        setPermissionMenuOpen={setPermissionMenuOpen}
        setSearchMenuOpen={setSearchMenuOpen}
      />
    </div>
  );
}
