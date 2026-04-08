"use client";

import { useMemo } from "react";
import { useAppState } from "@/features/app-state/providers/app-state-provider";
import type { DocumentRecord } from "@/features/app-state/types";
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
import { useEffect } from "react";

type UseEditorSurfaceModelArgs = {
  document: DocumentRecord;
  permission: "owner" | "can_edit" | "can_view";
  routerPushHome: () => void;
  saveDocument: ReturnType<typeof useAppState>["saveDocument"];
};

export function useEditorSurfaceModel({
  document,
  permission,
  routerPushHome,
  saveDocument,
}: UseEditorSurfaceModelArgs) {
  const {
    currentUser,
    currentWorkspace,
    moveDocumentToTrash,
    shareDocument,
    state,
    updateDocumentAccess,
    removeDocumentAccess,
  } = useAppState();
  const ui = useEditorSurfaceUiState();
  const { editorKeyDownRef } = ui;
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
  const slash = useEditorSlashMenu({
    canEditBody,
    editorReadyVersion,
    editorRef,
    editorContainerRef: ui.editorContainerRef,
  });

  useEffect(() => {
    editorKeyDownRef.current = slash.handleEditorKeyDown;
  }, [editorKeyDownRef, slash.handleEditorKeyDown]);

  useEditorOverlays({
    blockMenu: ui.blockMenu,
    blockMenuRef: ui.blockMenuRef,
    overflowButtonRef: ui.overflowButtonRef,
    overflowMenuOpen: ui.overflowMenuOpen,
    overflowMenuRef: ui.overflowMenuRef,
    permissionButtonRef: ui.permissionBody.permissionButtonRef,
    permissionMenuOpen: ui.permissionBody.permissionMenuOpen,
    permissionMenuRef: ui.permissionBody.permissionMenuRef,
    searchButtonRef: ui.searchBody.searchButtonRef,
    searchInputRef: ui.searchBody.searchInputRef,
    searchMenuOpen: ui.searchBody.searchMenuOpen,
    searchMenuRef: ui.searchBody.searchMenuRef,
    setBlockMenu: ui.setBlockMenu,
    setOverflowMenuOpen: ui.setOverflowMenuOpen,
    setPermissionMenuOpen: ui.permissionBody.setPermissionMenuOpen,
    setSearchMenuOpen: ui.searchBody.setSearchMenuOpen,
  });

  useEffect(() => {
    if (!editor || !ui.blockMenu.open || ui.blockMenu.pos == null) {
      return;
    }
    const domNode = editor.view.nodeDOM(ui.blockMenu.pos);
    if (!(domNode instanceof HTMLElement)) {
      return;
    }
    domNode.classList.add("is-active-block");
    return () => domNode.classList.remove("is-active-block");
  }, [editor, ui.blockMenu.open, ui.blockMenu.pos]);

  const hovered = useEditorHoveredBlock({
    blockControlsRef: ui.blockControlsRef,
    blockMenuRef: ui.blockMenuRef,
    canEditBody,
    editor,
    editorContainerRef: ui.editorContainerRef,
  });
  const blockTransformItems = useMemo<BlockTransformItem[]>(() => createBlockTransformItems(), []);
  const guestBadgeClass =
    "rounded-full border border-[#f0d9a7] bg-[#fbefcf] px-2 py-0.5 text-[11px] font-semibold text-[#c98a10]";
  const searchHeaderLabel =
    ui.searchBody.searchNotice === "No match found"
      ? "No match found"
      : ui.searchBody.searchMatchIndex >= 0
        ? `${ui.searchBody.searchMatchIndex + 1} / ${ui.searchBody.searchMatchCount}`
        : "";
  const actions = useEditorActions({
    blockMenu: ui.blockMenu,
    canEditBody,
    document,
    editor,
    editorContainerRef: ui.editorContainerRef,
    hoveredBlock: hovered.hoveredBlock,
    saveDocument,
    searchInputRef: ui.searchBody.searchInputRef,
    searchMatchIndex: ui.searchBody.searchMatchIndex,
    searchQuery: ui.searchBody.searchQuery,
    setActionError: ui.setActionError,
    setActionNotice: ui.setActionNotice,
    setBlockMenu: ui.setBlockMenu,
    setHoveredBlock: hovered.setHoveredBlock,
    setSearchMatchCount: ui.searchBody.setSearchMatchCount,
    setSearchMatchIndex: ui.searchBody.setSearchMatchIndex,
    setSearchNotice: ui.searchBody.setSearchNotice,
    setSearchRects: ui.searchBody.setSearchRects,
    status: ui.status,
    syncHoveredBlockFromPos: hovered.syncHoveredBlockFromPos,
  });

  useEditorShortcuts({
    canUndo: actions.canUndo,
    editor,
    searchMenuOpen: ui.searchBody.searchMenuOpen,
    setOverflowMenuOpen: ui.setOverflowMenuOpen,
    setPermissionMenuOpen: ui.permissionBody.setPermissionMenuOpen,
    setSearchMenuOpen: ui.searchBody.setSearchMenuOpen,
  });

  return {
    actions,
    blockTransformItems,
    canEditBody,
    canEditTitle,
    canManageAccess,
    commitTitle,
    currentUserId: currentUser?.id,
    documentId: document.id,
    documentStatus: document.status,
    editor,
    guestBadgeClass,
    hovered,
    permission,
    permissionLabel,
    routerPushHome,
    searchHeaderLabel,
    sharedAvatars,
    slash,
    titleError,
    titleInputRef,
    titleDraft,
    setTitleDraft,
    ui,
    accessEntries,
    moveDocumentToTrash,
    shareDocument,
    updateDocumentAccess,
    removeDocumentAccess,
  };
}
