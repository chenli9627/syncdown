"use client";

import type { Editor } from "@tiptap/react";
import type { RefObject } from "react";
import { EditorOverflowMenu } from "@/features/editor/components/editor-overflow-menu";

type EditorHeaderOverflowActionProps = {
  actionError: string | null;
  actionNotice: string | null;
  canEditBody: boolean;
  canUndo: boolean;
  documentId: string;
  editor: Editor | null;
  handleExportMarkdown: () => Promise<void>;
  handleExportMarkdownZip: () => Promise<void>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  importInputRef: RefObject<HTMLInputElement | null>;
  moveDocumentToTrash: (documentId: string) => Promise<{ error: string; ok: false } | { ok: true }>;
  overflowButtonRef: RefObject<HTMLButtonElement | null>;
  overflowMenuOpen: boolean;
  overflowMenuRef: RefObject<HTMLDivElement | null>;
  permission: "owner" | "can_edit" | "can_view";
  routerPushHome: () => void;
  setActionError: (value: string | null) => void;
  setActionNotice: (value: string | null) => void;
  setOverflowMenuOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setPermissionMenuOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setSearchMenuOpen: (value: boolean | ((current: boolean) => boolean)) => void;
};

async function moveToTrash(props: EditorHeaderOverflowActionProps) {
  const result = await props.moveDocumentToTrash(props.documentId);
  if (!result.ok) {
    props.setActionError(result.error);
    props.setActionNotice(null);
    return;
  }
  props.setOverflowMenuOpen(false);
  props.routerPushHome();
}

export function EditorHeaderOverflowAction(props: EditorHeaderOverflowActionProps) {
  return (
    <EditorOverflowMenu
      actionError={props.actionError}
      actionNotice={props.actionNotice}
      canEditBody={props.canEditBody}
      canUndo={props.canUndo}
      onExportMarkdown={() => void props.handleExportMarkdown()}
      onExportZip={() => void props.handleExportMarkdownZip()}
      onInsertImage={() => {
        props.setOverflowMenuOpen(false);
        props.imageInputRef.current?.click();
      }}
      onImport={() => props.importInputRef.current?.click()}
      onMoveToTrash={() => moveToTrash(props)}
      onOpenChange={(next) => {
        props.setOverflowMenuOpen(next);
        props.setSearchMenuOpen(false);
        props.setPermissionMenuOpen(false);
      }}
      onResetMessages={() => {
        props.setActionError(null);
        props.setActionNotice(null);
      }}
      onUndo={() => props.editor?.chain().focus().undo().run()}
      overflowButtonRef={props.overflowButtonRef}
      overflowMenuOpen={props.overflowMenuOpen}
      overflowMenuRef={props.overflowMenuRef}
      permission={props.permission}
    />
  );
}
