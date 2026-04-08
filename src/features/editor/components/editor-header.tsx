"use client";

import type { Editor } from "@tiptap/react";
import type { RefObject } from "react";
import { EditorOverflowMenu } from "@/features/editor/components/editor-overflow-menu";
import { EditorPermissionDropdown } from "@/features/editor/components/editor-permission-dropdown";
import { EditorPermissionPopover } from "@/features/editor/components/editor-permission-popover";
import { EditorSearchPopover } from "@/features/editor/components/editor-search-popover";
import { EditorToolbar } from "@/features/editor/components/editor-toolbar";
import type { AccessEntry } from "@/features/editor/lib/types";

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
  setTitleDraft: (value: string) => void;
  shareDocument: (
    documentId: string,
    payload: { email: string; permission: "can_edit" | "can_view" },
  ) => Promise<{ error: string; ok: false } | { ok: true }>;
  shareEmail: string;
  sharePermission: "can_edit" | "can_view";
  sharedAvatars: Array<{ id: string; name: string }>;
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
  setTitleDraft,
  shareDocument,
  shareEmail,
  sharePermission,
  sharedAvatars,
  statusLabel,
  titleDraft,
  titleError,
  titleInputRef,
  updateDocumentAccess,
}: EditorHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[rgba(255,255,255,0.94)] px-4 py-4 backdrop-blur-md">
      <div className="flex w-full flex-col">
        <div className="flex items-start justify-between gap-6">
          <div className="inline-flex max-w-full items-center gap-2">
            <div className="relative max-w-[min(100%,48rem)]">
              <span
                aria-hidden="true"
                className="invisible block whitespace-pre border-none bg-transparent px-0 text-[1.35rem] font-semibold tracking-[-0.028em] md:text-[1.55rem]"
              >
                {titleDraft || "Untitled"}
              </span>
              <input
                className="absolute inset-0 w-full border-none bg-transparent px-0 text-[1.35rem] font-semibold tracking-[-0.028em] outline-none placeholder:text-[var(--color-muted-foreground)] disabled:cursor-default md:text-[1.55rem]"
                disabled={!canEditTitle}
                onBlur={() => {
                  void commitTitle();
                }}
                onChange={(event) => {
                  setTitleDraft(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") {
                    return;
                  }

                  event.preventDefault();
                  void commitTitle();
                  editor?.commands.focus("end");
                }}
                placeholder="Untitled"
                ref={titleInputRef}
                value={titleDraft}
              />
            </div>
            {statusLabel ? (
              <div className="shrink-0 border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-2 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
                {statusLabel}
              </div>
            ) : (
              <div className="invisible shrink-0 border border-[var(--color-border)] px-2 py-1 text-xs font-medium">
                Saved
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <EditorPermissionPopover
              accessEntries={accessEntries}
              canManageAccess={canManageAccess}
              currentUserId={currentUserId}
              documentStatus={documentStatus}
              guestBadgeClass={guestBadgeClass}
              onCloseOtherMenus={() => {
                setActionError(null);
                setActionNotice(null);
                setSearchMenuOpen(false);
                setOverflowMenuOpen(false);
              }}
              onPermissionMenuToggle={setPermissionMenuOpen}
              onRemoveAccess={async (userId) => {
                setPermissionBusy(true);
                setPermissionError(null);
                setPermissionNotice(null);
                const result = await removeDocumentAccess(documentId, userId);
                setPermissionBusy(false);

                if (!result.ok) {
                  setPermissionError(result.error);
                  return;
                }

                setPermissionNotice("Access removed");
              }}
              onShareEmailChange={setShareEmail}
              onSharePermissionChange={setSharePermission}
              onShareSubmit={async (event) => {
                event.preventDefault();
                setPermissionBusy(true);
                setPermissionError(null);
                setPermissionNotice(null);

                const result = await shareDocument(documentId, {
                  email: shareEmail,
                  permission: sharePermission,
                });

                setPermissionBusy(false);

                if (!result.ok) {
                  setPermissionError(result.error);
                  return;
                }

                setShareEmail("");
                setSharePermission("can_view");
                setPermissionNotice("Guest added");
              }}
              onUpdateAccess={async (userId, nextPermission) => {
                setPermissionBusy(true);
                setPermissionError(null);
                setPermissionNotice(null);
                const result = await updateDocumentAccess(
                  documentId,
                  userId,
                  nextPermission,
                );
                setPermissionBusy(false);

                if (!result.ok) {
                  setPermissionError(result.error);
                  return;
                }

                setPermissionNotice("Permission updated");
              }}
              permissionBusy={permissionBusy}
              permissionButtonRef={permissionButtonRef}
              permissionError={permissionError}
              permissionLabel={permissionBoldLabel}
              permissionMenuOpen={permissionMenuOpen}
              permissionMenuRef={permissionMenuRef}
              permissionNotice={permissionNotice}
              PermissionDropdown={EditorPermissionDropdown}
              setPermissionError={setPermissionError}
              setPermissionNotice={setPermissionNotice}
              shareEmail={shareEmail}
              sharePermission={sharePermission}
              sharedAvatars={sharedAvatars}
            />

            <EditorSearchPopover
              onCloseOtherMenus={() => {
                setActionError(null);
                setActionNotice(null);
                setOverflowMenuOpen(false);
                setPermissionMenuOpen(false);
              }}
              onNext={onSearchNext}
              onPrevious={onSearchPrevious}
              onSearchChange={(value) => {
                setSearchRects([]);
                setSearchMatchCount(0);
                setSearchMatchIndex(-1);
                setSearchNotice(null);
                setSearchQuery(value);
              }}
              open={searchMenuOpen}
              searchButtonRef={searchButtonRef}
              searchHeaderLabel={searchHeaderLabel}
              searchInputRef={searchInputRef}
              searchMenuRef={searchMenuRef}
              searchNotice={searchNotice}
              searchQuery={searchQuery}
              setOpen={setSearchMenuOpen}
            />

            <EditorOverflowMenu
              actionError={actionError}
              actionNotice={actionNotice}
              canEditBody={canEditBody}
              canUndo={canUndo}
              onExport={() => {
                void handleExportMarkdown();
              }}
              onImport={() => {
                importInputRef.current?.click();
              }}
              onMoveToTrash={async () => {
                const result = await moveDocumentToTrash(documentId);

                if (!result.ok) {
                  setActionError(result.error);
                  setActionNotice(null);
                  return;
                }

                setOverflowMenuOpen(false);
                routerPushHome();
              }}
              onOpenChange={(next) => {
                setOverflowMenuOpen(next);
                setSearchMenuOpen(false);
                setPermissionMenuOpen(false);
              }}
              onResetMessages={() => {
                setActionError(null);
                setActionNotice(null);
              }}
              onUndo={() => {
                editor?.chain().focus().undo().run();
              }}
              overflowButtonRef={overflowButtonRef}
              overflowMenuOpen={overflowMenuOpen}
              overflowMenuRef={overflowMenuRef}
              permission={permission}
            />
          </div>
        </div>
        {titleError ? (
          <p className="mt-2 text-sm text-[#dd5b00]">{titleError}</p>
        ) : null}

        <EditorToolbar canEditBody={canEditBody} editor={editor} />
      </div>
    </div>
  );
}
