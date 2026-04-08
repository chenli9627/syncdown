"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAppState } from "@/features/app-state/providers/app-state-provider";
import type { DocumentRecord } from "@/features/app-state/types";
import { EditorCanvas } from "@/features/editor/components/editor-canvas";
import { EditorHeader } from "@/features/editor/components/editor-header";
import { useEditorAccessEntries } from "@/features/editor/hooks/use-editor-access-entries";
import { useEditorActions } from "@/features/editor/hooks/use-editor-actions";
import { useEditorHoveredBlock } from "@/features/editor/hooks/use-editor-hovered-block";
import { useEditorOverlays } from "@/features/editor/hooks/use-editor-overlays";
import { useEditorShortcuts } from "@/features/editor/hooks/use-editor-shortcuts";
import { useEditorSlashMenu } from "@/features/editor/hooks/use-editor-slash-menu";
import { useEditorSurfaceUiState } from "@/features/editor/hooks/use-editor-surface-ui";
import { useEditorTitleState } from "@/features/editor/hooks/use-editor-title-state";
import { useSyntextEditor } from "@/features/editor/hooks/use-syntext-editor";
import { createBlockTransformItems } from "@/features/editor/lib/menu-config";
import type { BlockTransformItem } from "@/features/editor/lib/types";
import { permissionLabel } from "@/features/editor/lib/utils";

type EditorSurfaceProps = {
  document: DocumentRecord;
  permission: "owner" | "can_edit" | "can_view";
  saveDocument: ReturnType<typeof useAppState>["saveDocument"];
};

export function EditorSurface({
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
  const ui = useEditorSurfaceUiState();
  const {
    actionError,
    actionNotice,
    blockControlsRef,
    blockMenu,
    blockMenuRef,
    editorContainerRef,
    editorKeyDownRef,
    importInputRef,
    overflowButtonRef,
    overflowMenuOpen,
    overflowMenuRef,
    permissionBody,
    searchBody,
    setActionError,
    setActionNotice,
    setBlockMenu,
    setOverflowMenuOpen,
    status,
  } = ui;
  const canEditTitle = permission === "owner";
  const canEditBody = permission === "owner" || permission === "can_edit";
  const canManageAccess = permission === "owner";
  const { commitTitle, setTitleDraft, titleDraft, titleError, titleInputRef } =
    useEditorTitleState({
      canEditTitle,
      documentId: document.id,
      documentTitle: document.title,
      saveDocument,
      setStatus: ui.setStatus,
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
    setStatus: ui.setStatus,
  });
  const { enabledSlashItems, filteredSlashItems, handleEditorKeyDown, setSlashMenu, slashContextState, slashMenu } =
    useEditorSlashMenu({
      canEditBody,
      editorReadyVersion,
      editorRef,
      editorContainerRef,
    });

  useEffect(() => {
    editorKeyDownRef.current = handleEditorKeyDown;
  }, [editorKeyDownRef, handleEditorKeyDown]);

  useEditorOverlays({
    blockMenu,
    blockMenuRef,
    overflowButtonRef,
    overflowMenuOpen,
    overflowMenuRef,
    permissionButtonRef: permissionBody.permissionButtonRef,
    permissionMenuOpen: permissionBody.permissionMenuOpen,
    permissionMenuRef: permissionBody.permissionMenuRef,
    searchButtonRef: searchBody.searchButtonRef,
    searchInputRef: searchBody.searchInputRef,
    searchMenuOpen: searchBody.searchMenuOpen,
    searchMenuRef: searchBody.searchMenuRef,
    setBlockMenu,
    setOverflowMenuOpen,
    setPermissionMenuOpen: permissionBody.setPermissionMenuOpen,
    setSearchMenuOpen: searchBody.setSearchMenuOpen,
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
    return () => domNode.classList.remove("is-active-block");
  }, [blockMenu.open, blockMenu.pos, editor]);

  const { hoveredBlock, setHoveredBlock, syncHoveredBlockFromPos } = useEditorHoveredBlock({
    blockControlsRef,
    blockMenuRef,
    canEditBody,
    editor,
    editorContainerRef,
  });
  const blockTransformItems = useMemo<BlockTransformItem[]>(() => createBlockTransformItems(), []);
  const guestBadgeClass =
    "rounded-full border border-[#f0d9a7] bg-[#fbefcf] px-2 py-0.5 text-[11px] font-semibold text-[#c98a10]";
  const searchHeaderLabel =
    searchBody.searchNotice === "No match found"
      ? "No match found"
      : searchBody.searchMatchIndex >= 0
        ? `${searchBody.searchMatchIndex + 1} / ${searchBody.searchMatchCount}`
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
    searchInputRef: searchBody.searchInputRef,
    searchMatchIndex: searchBody.searchMatchIndex,
    searchQuery: searchBody.searchQuery,
    setActionError,
    setActionNotice,
    setBlockMenu,
    setHoveredBlock,
    setSearchMatchCount: searchBody.setSearchMatchCount,
    setSearchMatchIndex: searchBody.setSearchMatchIndex,
    setSearchNotice: searchBody.setSearchNotice,
    setSearchRects: searchBody.setSearchRects,
    status,
    syncHoveredBlockFromPos,
  });

  useEditorShortcuts({
    canUndo,
    editor,
    searchMenuOpen: searchBody.searchMenuOpen,
    setOverflowMenuOpen,
    setPermissionMenuOpen: permissionBody.setPermissionMenuOpen,
    setSearchMenuOpen: searchBody.setSearchMenuOpen,
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
        onSearchNext={() => runSearch("forward")}
        onSearchPrevious={() => runSearch("backward")}
        overflowButtonRef={overflowButtonRef}
        overflowMenuOpen={overflowMenuOpen}
        overflowMenuRef={overflowMenuRef}
        permission={permission}
        permissionBoldLabel={permissionLabel}
        permissionBusy={permissionBody.permissionBusy}
        permissionButtonRef={permissionBody.permissionButtonRef}
        permissionError={permissionBody.permissionError}
        permissionMenuOpen={permissionBody.permissionMenuOpen}
        permissionMenuRef={permissionBody.permissionMenuRef}
        permissionNotice={permissionBody.permissionNotice}
        removeDocumentAccess={removeDocumentAccess}
        routerPushHome={() => router.push("/home")}
        searchButtonRef={searchBody.searchButtonRef}
        searchHeaderLabel={searchHeaderLabel}
        searchInputRef={searchBody.searchInputRef}
        searchMenuOpen={searchBody.searchMenuOpen}
        searchMenuRef={searchBody.searchMenuRef}
        searchNotice={searchBody.searchNotice}
        searchQuery={searchBody.searchQuery}
        setActionError={setActionError}
        setActionNotice={setActionNotice}
        setOverflowMenuOpen={setOverflowMenuOpen}
        setPermissionBusy={permissionBody.setPermissionBusy}
        setPermissionError={permissionBody.setPermissionError}
        setPermissionMenuOpen={permissionBody.setPermissionMenuOpen}
        setPermissionNotice={permissionBody.setPermissionNotice}
        setSearchMatchCount={searchBody.setSearchMatchCount}
        setSearchMatchIndex={searchBody.setSearchMatchIndex}
        setSearchMenuOpen={searchBody.setSearchMenuOpen}
        setSearchNotice={searchBody.setSearchNotice}
        setSearchQuery={searchBody.setSearchQuery}
        setSearchRects={searchBody.setSearchRects as (value: []) => void}
        setShareEmail={permissionBody.setShareEmail}
        setSharePermission={permissionBody.setSharePermission}
        setTitleDraft={setTitleDraft}
        shareDocument={shareDocument}
        shareEmail={permissionBody.shareEmail}
        sharePermission={permissionBody.sharePermission}
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
        searchRects={searchBody.searchRects}
        setBlockMenu={setBlockMenu}
        setSlashMenu={setSlashMenu}
        slashContextState={slashContextState}
        slashMenu={slashMenu}
      />
    </div>
  );
}
