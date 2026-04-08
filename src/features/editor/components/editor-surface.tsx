"use client";

import { useRouter } from "next/navigation";
import { useAppState } from "@/features/app-state/providers/app-state-provider";
import { EditorActionErrorDialog } from "@/features/editor/components/editor-action-error-dialog";
import type { DocumentRecord } from "@/features/app-state/types";
import { EditorCanvas } from "@/features/editor/components/editor-canvas";
import { EditorHeader } from "@/features/editor/components/editor-header";
import { useEditorSurfaceModel } from "@/features/editor/hooks/use-editor-surface-model";

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
  const blockMenuWidth = 168;
  const model = useEditorSurfaceModel({
    document,
    permission,
    routerPushHome: () => router.push("/home"),
    saveDocument,
  });

  return (
    <div className="relative flex min-h-full flex-col bg-[linear-gradient(180deg,#ffffff_0%,#fdfcfb_100%)]">
      <EditorActionErrorDialog
        error={model.ui.actionError}
        onClose={() => model.ui.setActionError(null)}
      />
      <EditorHeader
        accessEntries={model.accessEntries}
        actionError={model.ui.actionError}
        actionNotice={model.ui.actionNotice}
        canEditBody={model.canEditBody}
        canEditTitle={model.canEditTitle}
        canManageAccess={model.canManageAccess}
        canUndo={model.actions.canUndo}
        commitTitle={model.commitTitle}
        currentUserId={model.currentUserId}
        documentId={model.documentId}
        documentStatus={model.documentStatus}
        editor={model.editor}
        guestBadgeClass={model.guestBadgeClass}
        handleExportMarkdown={model.actions.handleExportMarkdown}
        imageInputRef={model.ui.imageInputRef}
        importInputRef={model.ui.importInputRef}
        moveDocumentToTrash={model.moveDocumentToTrash}
        onSearchNext={() => model.actions.runSearch("forward")}
        onSearchPrevious={() => model.actions.runSearch("backward")}
        overflowButtonRef={model.ui.overflowButtonRef}
        overflowMenuOpen={model.ui.overflowMenuOpen}
        overflowMenuRef={model.ui.overflowMenuRef}
        permission={model.permission}
        permissionBoldLabel={model.permissionLabel}
        permissionBusy={model.ui.permissionBody.permissionBusy}
        permissionButtonRef={model.ui.permissionBody.permissionButtonRef}
        permissionError={model.ui.permissionBody.permissionError}
        permissionMenuOpen={model.ui.permissionBody.permissionMenuOpen}
        permissionMenuRef={model.ui.permissionBody.permissionMenuRef}
        permissionNotice={model.ui.permissionBody.permissionNotice}
        removeDocumentAccess={model.removeDocumentAccess}
        routerPushHome={model.routerPushHome}
        searchButtonRef={model.ui.searchBody.searchButtonRef}
        searchHeaderLabel={model.searchHeaderLabel}
        searchInputRef={model.ui.searchBody.searchInputRef}
        searchMenuOpen={model.ui.searchBody.searchMenuOpen}
        searchMenuRef={model.ui.searchBody.searchMenuRef}
        searchNotice={model.ui.searchBody.searchNotice}
        searchQuery={model.ui.searchBody.searchQuery}
        setActionError={model.ui.setActionError}
        setActionNotice={model.ui.setActionNotice}
        setOverflowMenuOpen={model.ui.setOverflowMenuOpen}
        setPermissionBusy={model.ui.permissionBody.setPermissionBusy}
        setPermissionError={model.ui.permissionBody.setPermissionError}
        setPermissionMenuOpen={model.ui.permissionBody.setPermissionMenuOpen}
        setPermissionNotice={model.ui.permissionBody.setPermissionNotice}
        setSearchMatchCount={model.ui.searchBody.setSearchMatchCount}
        setSearchMatchIndex={model.ui.searchBody.setSearchMatchIndex}
        setSearchMenuOpen={model.ui.searchBody.setSearchMenuOpen}
        setSearchNotice={model.ui.searchBody.setSearchNotice}
        setSearchQuery={model.ui.searchBody.setSearchQuery}
        setSearchRects={model.ui.searchBody.setSearchRects as (value: []) => void}
        setShareEmail={model.ui.permissionBody.setShareEmail}
        setSharePermission={model.ui.permissionBody.setSharePermission}
        setTitleDraft={model.setTitleDraft}
        shareDocument={model.shareDocument}
        shareEmail={model.ui.permissionBody.shareEmail}
        sharePermission={model.ui.permissionBody.sharePermission}
        sharedAvatars={model.sharedAvatars}
        statusLabel={model.actions.statusLabel}
        titleDraft={model.titleDraft}
        titleError={model.titleError}
        titleInputRef={model.titleInputRef}
        updateDocumentAccess={model.updateDocumentAccess}
      />
      <EditorCanvas
        blockControlsRef={model.ui.blockControlsRef}
        blockMenu={model.ui.blockMenu}
        blockMenuRef={model.ui.blockMenuRef}
        blockMenuWidth={blockMenuWidth}
        blockTransformItems={model.blockTransformItems}
        canEditBody={model.canEditBody}
        currentTransformActiveId={model.actions.currentTransformActiveId}
        editor={model.editor}
        editorContainerRef={model.ui.editorContainerRef}
        enabledSlashItems={model.slash.enabledSlashItems}
        filteredSlashItems={model.slash.filteredSlashItems}
        handleCloseSlashMenu={model.slash.closeSlashMenuFromUi}
        handleCopyImage={model.actions.handleCopyImage}
        handleDeleteBlock={model.actions.handleDeleteBlock}
        handleDownloadImage={model.actions.handleDownloadImage}
        handleDuplicateBlock={model.actions.handleDuplicateBlock}
        handleImportMarkdown={model.actions.handleImportMarkdown}
        handleInsertImage={model.actions.handleInsertImage}
        handleInsertBlockBefore={model.actions.handleInsertBlockBefore}
        handleTurnInto={model.actions.handleTurnInto}
        hoveredBlock={model.hovered.hoveredBlock}
        imageInputRef={model.ui.imageInputRef}
        importInputRef={model.ui.importInputRef}
        searchRects={model.ui.searchBody.searchRects}
        aiBubble={model.selectionAi.aiBubble}
        aiBubbleRef={model.selectionAi.aiBubbleRef}
        onAiApply={model.selectionAi.actions.applyResult}
        onAiClose={model.selectionAi.actions.closeAll}
        onAiInsertBelow={model.selectionAi.actions.insertBelow}
        onAiPreviewAction={model.selectionAi.actions.previewAction}
        onAiPromptChange={model.selectionAi.actions.setPrompt}
        onFormatSelection={model.selectionAi.actions.formatSelection}
        onOpenAiMenu={model.selectionAi.actions.openAiMenu}
        selectionBubble={model.selectionAi.selectionBubble}
        selectionBubbleRef={model.selectionAi.selectionBubbleRef}
        syncHoveredBlockFromPos={model.hovered.syncHoveredBlockFromPos}
        setBlockMenu={model.ui.setBlockMenu}
        setSlashMenu={model.slash.setSlashMenu}
        slashContextState={model.slash.slashContextState}
        slashMenu={model.slash.slashMenu}
      />
    </div>
  );
}
