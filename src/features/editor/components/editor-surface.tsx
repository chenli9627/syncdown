"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { useAppState } from "@/features/app-state/providers/app-state-provider";
import { EditorActionErrorDialog } from "@/features/editor/components/editor-action-error-dialog";
import { EditorAiChatPanel } from "@/features/editor/components/editor-ai-chat-panel";
import type { DocumentRecord, DocumentVersion } from "@/features/app-state/types";
import { EditorCanvas } from "@/features/editor/components/editor-canvas";
import { EditorHeader } from "@/features/editor/components/editor-header";
import { EditorUpdatesPanel } from "@/features/editor/components/editor-updates-panel";
import { EditorVersionHistoryPanel } from "@/features/editor/components/editor-version-history-panel";
import { useEditorAiChatLayout } from "@/features/editor/hooks/use-editor-ai-chat-layout";
import { useEditorSurfaceModel } from "@/features/editor/hooks/use-editor-surface-model";
import { toEditorContent } from "@/features/editor/lib/content";
import { MessageCircleMore } from "lucide-react";

type EditorSurfaceProps = {
  document: DocumentRecord;
  initialFocusTitle?: boolean;
  permission: "owner" | "can_edit" | "can_view";
  saveDocument: ReturnType<typeof useAppState>["saveDocument"];
};

export function EditorSurface({
  document,
  initialFocusTitle = false,
  permission,
  saveDocument,
}: EditorSurfaceProps) {
  const { t } = useLocale();
  const router = useRouter();
  const blockMenuWidth = 168;
  const {
    aiChatOpen,
    aiPanelWidth,
    handleAiPanelResizeStart,
    isNarrowAiLayout,
    setAiChatOpen,
  } = useEditorAiChatLayout();
  const [restoreBusy, setRestoreBusy] = useState(false);
  const model = useEditorSurfaceModel({
    document,
    permission,
    routerPushHome: () => router.push("/home"),
    saveDocument,
  });
  const { setUpdatesOpen, updatesOpen } = model.ui.updatesBody;
  const {
    selectedVersionId,
    setSelectedVersionId,
    setVersionHistoryOpen,
    versionHistoryOpen,
  } = model.ui.versionHistoryBody;
  const currentUser =
    model.state.users.find((user) => user.id === model.currentUserId) ?? null;

  useEffect(() => {
    if (!versionHistoryOpen) {
      return;
    }

    if (selectedVersionId) {
      return;
    }

    const firstVersion = document.versionHistory?.[0] ?? null;

    if (firstVersion) {
      setSelectedVersionId(firstVersion.id);
    }
  }, [document.versionHistory, selectedVersionId, setSelectedVersionId, versionHistoryOpen]);

  function handleRestoreVersion(version: DocumentVersion) {
    if (!model.canEditBody || !model.editor || restoreBusy || version.content === document.content) {
      return;
    }

    setRestoreBusy(true);
    model.ui.setStatus("saving");
    model.editor.commands.setContent(toEditorContent(version.content), {
      emitUpdate: false,
    });
    void saveDocument(document.id, {
      content: version.content,
      versionHistoryMode: "force",
    }).then((result) => {
      if (!result.ok) {
        model.ui.setStatus("error");
        model.ui.setActionError(result.error);
        return;
      }

      model.ui.setStatus("saved");
      window.setTimeout(() => {
        model.ui.setStatus("idle");
      }, 1200);
      setVersionHistoryOpen(false);
      setSelectedVersionId(null);
    }).finally(() => {
      setRestoreBusy(false);
    });
  }

  return (
    <div
      className="relative flex min-h-full"
      style={{ background: "var(--color-editor-surface-gradient)" }}
    >
      <EditorActionErrorDialog
        error={model.ui.actionError}
        onClose={() => model.ui.setActionError(null)}
      />
      <div className="relative flex min-w-0 flex-1 flex-col">
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
          initialFocusTitle={initialFocusTitle}
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
          setUpdatesOpen={setUpdatesOpen}
          setVersionHistoryOpen={setVersionHistoryOpen}
          shareDocument={model.shareDocument}
          shareEmail={model.ui.permissionBody.shareEmail}
          sharePermission={model.ui.permissionBody.sharePermission}
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
          filteredSlashItems={model.slash.filteredSlashItems}
          handleCloseSlashMenu={model.slash.closeSlashMenuFromUi}
          handleDeleteBlock={model.actions.handleDeleteBlock}
          handleDeleteTable={model.actions.handleDeleteTable}
          handleDownloadImage={model.actions.handleDownloadImage}
          handleDuplicateBlock={model.actions.handleDuplicateBlock}
          handleImportMarkdown={model.actions.handleImportMarkdown}
          handleInsertImage={model.actions.handleInsertImage}
          handleInsertBlockBefore={model.actions.handleInsertBlockBefore}
          handleInsertTableColumn={model.actions.handleInsertTableColumn}
          handleInsertTableRow={model.actions.handleInsertTableRow}
          handleTableColumnMove={model.actions.handleTableColumnMove}
          handleTableColumnAction={model.actions.handleTableColumnAction}
          handleTableRowMove={model.actions.handleTableRowMove}
          handleTableRowAction={model.actions.handleTableRowAction}
          handleTurnInto={model.actions.handleTurnInto}
          hoveredBlock={model.hovered.hoveredBlock}
          imageInputRef={model.ui.imageInputRef}
          importInputRef={model.ui.importInputRef}
          remoteEntries={model.presence.remoteEntries}
          searchRects={model.ui.searchBody.searchRects}
          aiHighlightRects={model.selectionAi.aiBubble.highlightRects}
          aiBubble={model.selectionAi.aiBubble}
          aiBubbleRef={model.selectionAi.aiBubbleRef}
          onAiApply={model.selectionAi.actions.applyResult}
          onAiClose={model.selectionAi.actions.closeAll}
          onAiInsertBelow={model.selectionAi.actions.insertBelow}
          onAiPreviewAction={model.selectionAi.actions.previewAction}
          onAiPromptChange={model.selectionAi.actions.setPrompt}
          onAiResultCountChange={model.selectionAi.actions.setCandidateCount}
          onAiSelectCandidate={model.selectionAi.actions.selectCandidate}
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
        {versionHistoryOpen && permission !== "can_view" ? (
          <EditorVersionHistoryPanel
            canRestore={model.canEditBody && Boolean(model.editor) && !restoreBusy}
            document={document}
            onClose={() => {
              setVersionHistoryOpen(false);
              setSelectedVersionId(null);
            }}
            onRestore={handleRestoreVersion}
            onSelectVersion={setSelectedVersionId}
            selectedVersionId={selectedVersionId}
            users={model.state.users}
          />
        ) : null}
        {updatesOpen && permission !== "can_view" ? (
          <EditorUpdatesPanel
            document={document}
            onClose={() => setUpdatesOpen(false)}
            users={model.state.users}
          />
        ) : null}
      </div>
      {model.canEditBody && !aiChatOpen ? (
        <button
          className="fixed bottom-5 right-5 z-30 inline-flex h-11 w-11 items-center justify-center border border-[#111111] bg-white text-[#111111] shadow-[var(--shadow-soft-card)] transition hover:bg-[#111111] hover:text-white"
          onClick={() => setAiChatOpen(true)}
          title={t("aiOpenChat")}
          type="button"
        >
          <MessageCircleMore aria-hidden="true" size={19} />
        </button>
      ) : null}
      {model.canEditBody && aiChatOpen ? (
        <EditorAiChatPanel
          currentUser={currentUser}
          documentId={document.id}
          documentTitle={model.titleDraft || document.title}
          editor={model.editor}
          isNarrow={isNarrowAiLayout}
          isOverlay={!isNarrowAiLayout}
          onClose={() => setAiChatOpen(false)}
          onResizeStart={handleAiPanelResizeStart}
          panelWidth={aiPanelWidth}
        />
      ) : null}
    </div>
  );
}
