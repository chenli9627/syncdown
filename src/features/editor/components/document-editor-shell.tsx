"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  DocumentRecord,
} from "@/features/app-state/types";
import { useAppState } from "@/features/app-state/providers/app-state-provider";
import { EditorCanvas } from "@/features/editor/components/editor-canvas";
import { EditorHeader } from "@/features/editor/components/editor-header";
import { DocumentShellGate } from "@/features/editor/components/document-shell-gate";
import { useEditorActions } from "@/features/editor/hooks/use-editor-actions";
import { useEditorAccessEntries } from "@/features/editor/hooks/use-editor-access-entries";
import { useDocumentShellState } from "@/features/editor/hooks/use-document-shell-state";
import { useEditorHoveredBlock } from "@/features/editor/hooks/use-editor-hovered-block";
import { useEditorOverlays } from "@/features/editor/hooks/use-editor-overlays";
import { useEditorShortcuts } from "@/features/editor/hooks/use-editor-shortcuts";
import { useEditorSlashMenu } from "@/features/editor/hooks/use-editor-slash-menu";
import { useEditorTitleState } from "@/features/editor/hooks/use-editor-title-state";
import { useSyntextEditor } from "@/features/editor/hooks/use-syntext-editor";
import {
  createBlockTransformItems,
} from "@/features/editor/lib/menu-config";
import {
  type SearchRect,
} from "@/features/editor/lib/search";
import type {
  BlockTransformItem,
} from "@/features/editor/lib/types";
import {
  permissionLabel,
} from "@/features/editor/lib/utils";

type DocumentEditorShellProps = {
  documentId: string;
};

type EditorSurfaceProps = {
  document: DocumentRecord;
  permission: "owner" | "can_edit" | "can_view";
  saveDocument: ReturnType<typeof useAppState>["saveDocument"];
};

function EditorSurface({
  document,
  permission,
  saveDocument,
}: EditorSurfaceProps) {
  const router = useRouter();
  const {
    currentUser,
    currentWorkspace,
    moveDocumentToTrash,
    shareDocument,
    state,
    updateDocumentAccess,
    removeDocumentAccess,
  } = useAppState();
  const blockMenuWidth = 208;
  const blockControlsRef = useRef<HTMLDivElement | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const blockMenuRef = useRef<HTMLDivElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchMenuRef = useRef<HTMLDivElement | null>(null);
  const overflowButtonRef = useRef<HTMLButtonElement | null>(null);
  const overflowMenuRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const permissionButtonRef = useRef<HTMLButtonElement | null>(null);
  const permissionMenuRef = useRef<HTMLDivElement | null>(null);
  const editorKeyDownRef = useRef<(event: KeyboardEvent) => boolean>(() => false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  const [searchMatchIndex, setSearchMatchIndex] = useState(-1);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [searchRects, setSearchRects] = useState<SearchRect[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [permissionMenuOpen, setPermissionMenuOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<"can_edit" | "can_view">(
    "can_view",
  );
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [blockMenu, setBlockMenu] = useState<{
    left: number;
    open: boolean;
    pos: number | null;
    showTurnInto: boolean;
    top: number;
  }>({
    left: 0,
    open: false,
    pos: null,
    showTurnInto: false,
    top: 0,
  });
  const canEditTitle = permission === "owner";
  const canEditBody = permission === "owner" || permission === "can_edit";
  const canManageAccess = permission === "owner";
  const {
    commitTitle,
    setTitleDraft,
    titleDraft,
    titleError,
    titleInputRef,
  } = useEditorTitleState({
    canEditTitle,
    documentId: document.id,
    documentTitle: document.title,
    saveDocument,
    setStatus,
  });
  const { accessEntries, sharedAvatars } = useEditorAccessEntries(
    state,
    document,
    currentWorkspace,
  );
  const { editor, editorReadyVersion, editorRef } = useSyntextEditor({
    canEditBody,
    content: document.content,
    documentId: document.id,
    onEditorKeyDown: (event) => editorKeyDownRef.current(event),
    saveDocument,
    setStatus,
  });

  const {
    enabledSlashItems,
    filteredSlashItems,
    handleEditorKeyDown,
    setSlashMenu,
    slashContextState,
    slashMenu,
  } = useEditorSlashMenu({
    canEditBody,
    editorReadyVersion,
    editorRef,
    editorContainerRef,
  });

  useEffect(() => {
    editorKeyDownRef.current = handleEditorKeyDown;
  }, [handleEditorKeyDown]);

  useEditorOverlays({
    blockMenu,
    blockMenuRef,
    overflowButtonRef,
    overflowMenuOpen,
    overflowMenuRef,
    permissionButtonRef,
    permissionMenuOpen,
    permissionMenuRef,
    searchButtonRef,
    searchInputRef,
    searchMenuOpen,
    searchMenuRef,
    setBlockMenu,
    setOverflowMenuOpen,
    setPermissionMenuOpen,
    setSearchMenuOpen,
  });

  useEffect(() => {
    if (!editor || !blockMenu.open || blockMenu.pos == null) {
      return;
    }

    const domNode = editor.view.nodeDOM(blockMenu.pos);

    if (!(domNode instanceof HTMLElement)) {
      return;
    }

    domNode.classList.add("is-active-block");

    return () => {
      domNode.classList.remove("is-active-block");
    };
  }, [blockMenu.open, blockMenu.pos, editor]);

  const {
    hoveredBlock,
    setHoveredBlock,
    syncHoveredBlockFromPos,
  } = useEditorHoveredBlock({
    blockControlsRef,
    blockMenuRef,
    canEditBody,
    editor,
    editorContainerRef,
  });

  const blockTransformItems = useMemo<BlockTransformItem[]>(
    () => createBlockTransformItems(),
    [],
  );

  const guestBadgeClass =
    "rounded-full border border-[#f0d9a7] bg-[#fbefcf] px-2 py-0.5 text-[11px] font-semibold text-[#c98a10]";
  const searchHeaderLabel =
    searchNotice === "No match found"
      ? "No match found"
      : searchMatchIndex >= 0
        ? `${searchMatchIndex + 1} / ${searchMatchCount}`
        : "";
  const {
    canUndo,
    currentTransformActiveId,
    handleDeleteBlock,
    handleDuplicateBlock,
    handleExportMarkdown,
    handleImportMarkdown,
    handleInsertBlockBefore,
    handleTurnInto,
    runSearch,
    statusLabel,
  } = useEditorActions({
    blockMenu,
    canEditBody,
    document,
    editor,
    editorContainerRef,
    hoveredBlock,
    saveDocument,
    searchInputRef,
    searchMatchIndex,
    searchQuery,
    setActionError,
    setActionNotice,
    setBlockMenu,
    setHoveredBlock,
    setSearchMatchCount,
    setSearchMatchIndex,
    setSearchNotice,
    setSearchRects,
    status,
    syncHoveredBlockFromPos,
  });

  useEditorShortcuts({
    canUndo,
    editor,
    searchMenuOpen,
    setOverflowMenuOpen,
    setPermissionMenuOpen,
    setSearchMenuOpen,
  });

  return (
    <div className="flex min-h-full flex-col bg-[linear-gradient(180deg,#ffffff_0%,#fdfcfb_100%)]">
      <EditorHeader
        accessEntries={accessEntries}
        actionError={actionError}
        actionNotice={actionNotice}
        canEditBody={canEditBody}
        canEditTitle={canEditTitle}
        canManageAccess={canManageAccess}
        canUndo={canUndo}
        commitTitle={commitTitle}
        currentUserId={currentUser?.id}
        documentId={document.id}
        documentStatus={document.status}
        editor={editor}
        guestBadgeClass={guestBadgeClass}
        handleExportMarkdown={handleExportMarkdown}
        importInputRef={importInputRef}
        moveDocumentToTrash={moveDocumentToTrash}
        onSearchNext={() => {
          runSearch("forward");
        }}
        onSearchPrevious={() => {
          runSearch("backward");
        }}
        overflowButtonRef={overflowButtonRef}
        overflowMenuOpen={overflowMenuOpen}
        overflowMenuRef={overflowMenuRef}
        permission={permission}
        permissionBoldLabel={permissionLabel}
        permissionBusy={permissionBusy}
        permissionButtonRef={permissionButtonRef}
        permissionError={permissionError}
        permissionMenuOpen={permissionMenuOpen}
        permissionMenuRef={permissionMenuRef}
        permissionNotice={permissionNotice}
        removeDocumentAccess={removeDocumentAccess}
        routerPushHome={() => {
          router.push("/home");
        }}
        searchButtonRef={searchButtonRef}
        searchHeaderLabel={searchHeaderLabel}
        searchInputRef={searchInputRef}
        searchMenuOpen={searchMenuOpen}
        searchMenuRef={searchMenuRef}
        searchNotice={searchNotice}
        searchQuery={searchQuery}
        setActionError={setActionError}
        setActionNotice={setActionNotice}
        setOverflowMenuOpen={setOverflowMenuOpen}
        setPermissionBusy={setPermissionBusy}
        setPermissionError={setPermissionError}
        setPermissionMenuOpen={setPermissionMenuOpen}
        setPermissionNotice={setPermissionNotice}
        setSearchMatchCount={setSearchMatchCount}
        setSearchMatchIndex={setSearchMatchIndex}
        setSearchMenuOpen={setSearchMenuOpen}
        setSearchNotice={setSearchNotice}
        setSearchQuery={setSearchQuery}
        setSearchRects={setSearchRects as (value: []) => void}
        setShareEmail={setShareEmail}
        setSharePermission={setSharePermission}
        setTitleDraft={setTitleDraft}
        shareDocument={shareDocument}
        shareEmail={shareEmail}
        sharePermission={sharePermission}
        sharedAvatars={sharedAvatars}
        statusLabel={statusLabel}
        titleDraft={titleDraft}
        titleError={titleError}
        titleInputRef={titleInputRef}
        updateDocumentAccess={updateDocumentAccess}
      />

      <EditorCanvas
        blockControlsRef={blockControlsRef}
        blockMenu={blockMenu}
        blockMenuRef={blockMenuRef}
        blockMenuWidth={blockMenuWidth}
        blockTransformItems={blockTransformItems}
        canEditBody={canEditBody}
        currentTransformActiveId={currentTransformActiveId}
        editor={editor}
        editorContainerRef={editorContainerRef}
        enabledSlashItems={enabledSlashItems}
        filteredSlashItems={filteredSlashItems}
        handleDeleteBlock={handleDeleteBlock}
        handleDuplicateBlock={handleDuplicateBlock}
        handleImportMarkdown={handleImportMarkdown}
        handleInsertBlockBefore={handleInsertBlockBefore}
        handleTurnInto={handleTurnInto}
        hoveredBlock={hoveredBlock}
        importInputRef={importInputRef}
        searchRects={searchRects}
        setBlockMenu={setBlockMenu}
        setSlashMenu={setSlashMenu}
        slashContextState={slashContextState}
        slashMenu={slashMenu}
      />
    </div>
  );
}

export function DocumentEditorShell({ documentId }: DocumentEditorShellProps) {
  const {
    currentUser,
    currentWorkspace,
    document,
    permission,
    rawDocument,
    ready,
    saveDocument,
  } = useDocumentShellState(documentId);

  if (!ready || !currentUser) {
    return null;
  }

  if (rawDocument?.status === "trashed") {
    return <DocumentShellGate mode="deleted" />;
  }

  if (rawDocument && !permission) {
    return <DocumentShellGate mode="no_access" />;
  }

  if (!document || !currentWorkspace || !permission) {
    return null;
  }

  return (
    <EditorSurface
      document={document}
      key={document.id}
      permission={permission}
      saveDocument={saveDocument}
    />
  );
}
