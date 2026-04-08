"use client";

import type { Editor } from "@tiptap/react";
import { useEffect } from "react";
import { closeSlashMenu, getSlashMenuPosition } from "@/features/editor/lib/slash-menu";
import { getSlashContext } from "@/features/editor/lib/utils";
import type { SlashContext, SlashItem, SlashMenuState } from "@/features/editor/lib/types";

type UseEditorSlashSyncArgs = {
  canEditBody: boolean;
  editorReadyVersion: number;
  editorRef: React.RefObject<Editor | null>;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  filteredSlashItemsRef: React.RefObject<SlashItem[]>;
  setSlashContextState: React.Dispatch<React.SetStateAction<SlashContext | null>>;
  setSlashMenu: React.Dispatch<React.SetStateAction<SlashMenuState>>;
  slashContextRef: React.RefObject<SlashContext | null>;
};

export function useEditorSlashSync({
  canEditBody,
  editorReadyVersion,
  editorRef,
  editorContainerRef,
  filteredSlashItemsRef,
  setSlashContextState,
  setSlashMenu,
  slashContextRef,
}: UseEditorSlashSyncArgs) {
  useEffect(() => {
    const editor = editorRef.current;

    if (!editor || !canEditBody) {
      return;
    }

    const syncSlashMenu = createSlashMenuSyncHandler({
      editor,
      editorContainerRef,
      filteredSlashItemsRef,
      setSlashContextState,
      setSlashMenu,
      slashContextRef,
    });

    syncSlashMenu();
    editor.on("selectionUpdate", syncSlashMenu);
    editor.on("transaction", syncSlashMenu);
    editor.on("blur", syncSlashMenu);
    editor.on("focus", syncSlashMenu);

    return () => {
      editor.off("selectionUpdate", syncSlashMenu);
      editor.off("transaction", syncSlashMenu);
      editor.off("blur", syncSlashMenu);
      editor.off("focus", syncSlashMenu);
    };
  }, [
    canEditBody,
    editorContainerRef,
    editorReadyVersion,
    editorRef,
    filteredSlashItemsRef,
    setSlashContextState,
    setSlashMenu,
    slashContextRef,
  ]);
}

function createSlashMenuSyncHandler({
  editor,
  editorContainerRef,
  filteredSlashItemsRef,
  setSlashContextState,
  setSlashMenu,
  slashContextRef,
}: Omit<UseEditorSlashSyncArgs, "canEditBody" | "editorReadyVersion" | "editorRef"> & {
  editor: Editor;
}) {
  return () => {
    if (!editor.isFocused) {
      resetSlashMenuState(setSlashContextState, setSlashMenu, slashContextRef);
      return;
    }

    const slashContext = getSlashContext(editor);
    const container = editorContainerRef.current;

    if (!slashContext || !container) {
      resetSlashMenuState(setSlashContextState, setSlashMenu, slashContextRef);
      return;
    }

    const position = getSlashMenuPosition(editor, container, filteredSlashItemsRef.current.length);
    slashContextRef.current = slashContext;
    setSlashContextState(slashContext);
    setSlashMenu((current) => ({
      activeIndex: shouldResetSlashIndex(current, slashContext) ? 0 : current.activeIndex,
      left: position.left,
      open: true,
      placement: position.placement,
      query: slashContext.query,
      top: position.top,
    }));
  };
}

function resetSlashMenuState(
  setSlashContextState: React.Dispatch<React.SetStateAction<SlashContext | null>>,
  setSlashMenu: React.Dispatch<React.SetStateAction<SlashMenuState>>,
  slashContextRef: React.RefObject<SlashContext | null>,
) {
  slashContextRef.current = null;
  setSlashContextState(null);
  setSlashMenu((current) => closeSlashMenu(current));
}

function shouldResetSlashIndex(current: SlashMenuState, slashContext: SlashContext) {
  return current.query !== slashContext.query || !current.open;
}
