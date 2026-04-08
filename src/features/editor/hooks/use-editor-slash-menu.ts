"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorSlashItems } from "@/features/editor/hooks/use-editor-slash-items";
import { useEditorSlashSync } from "@/features/editor/hooks/use-editor-slash-sync";
import {
  closeSlashMenu,
  createInitialSlashMenuState,
  getSlashMenuPosition,
  handleSlashMenuKeyDownEvent,
} from "@/features/editor/lib/slash-menu";
import { getSlashContext } from "@/features/editor/lib/utils";
import type { SlashContext, SlashItem, SlashMenuState } from "@/features/editor/lib/types";

type UseEditorSlashMenuArgs = {
  canEditBody: boolean;
  editorReadyVersion: number;
  editorRef: React.RefObject<Editor | null>;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
};

export function useEditorSlashMenu({
  canEditBody,
  editorReadyVersion,
  editorRef,
  editorContainerRef,
}: UseEditorSlashMenuArgs) {
  const [slashContextState, setSlashContextState] = useState<SlashContext | null>(null);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>(createInitialSlashMenuState);
  const slashMenuRef = useRef(slashMenu);
  const slashContextRef = useRef<SlashContext | null>(null);
  const filteredSlashItemsRef = useRef<SlashItem[]>([]);
  const { enabledSlashItems, filteredSlashItems } = useEditorSlashItems(slashMenu.query);

  useEffect(() => {
    slashMenuRef.current = slashMenu;
  }, [slashMenu]);

  useEffect(() => {
    filteredSlashItemsRef.current = filteredSlashItems;
  }, [filteredSlashItems]);

  useEditorSlashSync({
    canEditBody,
    editorReadyVersion,
    editorRef,
    editorContainerRef,
    filteredSlashItemsRef,
    setSlashContextState,
    setSlashMenu,
    slashContextRef,
  });

  const closeSlashMenuFromUi = useCallback(() => {
    const editor = editorRef.current;
    const slashContext = slashContextRef.current;
    const shouldRemoveTrigger =
      slashMenuRef.current.removeTriggerOnClose && editor && slashContext;

    if (shouldRemoveTrigger) {
      editor
        .chain()
        .focus()
        .deleteRange({ from: slashContext.from, to: slashContext.to })
        .run();
    }

    setSlashContextState(null);
    slashContextRef.current = null;
    setSlashMenu((current) => closeSlashMenu(current));
  }, [editorRef]);

  const openSlashMenuFromEditor = useCallback(
    (options?: {
      removeTriggerOnClose?: boolean;
      slashContextOverride?: SlashContext;
    }) => {
      const removeTriggerOnClose = options?.removeTriggerOnClose ?? false;
      const slashContextOverride = options?.slashContextOverride ?? null;
      const tryOpen = (attempt: number) => {
        const editor = editorRef.current;
        const container = editorContainerRef.current;

        if (!editor || !container) {
          return;
        }

        const slashContext = slashContextOverride ?? getSlashContext(editor);

        if (!slashContext) {
          if (attempt < 2) {
            window.requestAnimationFrame(() => {
              tryOpen(attempt + 1);
            });
          }
          return;
        }

        const position = getSlashMenuPosition(
          editor,
          container,
          filteredSlashItemsRef.current.length,
        );

        slashContextRef.current = slashContext;
        setSlashContextState(slashContext);
        setSlashMenu({
          activeIndex: 0,
          left: position.left,
          open: true,
          placement: position.placement,
          query: slashContext.query,
          removeTriggerOnClose,
          top: position.top,
        });
      };

      tryOpen(0);
    },
    [editorContainerRef, editorRef],
  );

  const handleEditorKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && slashMenuRef.current.open) {
        event.preventDefault();
        closeSlashMenuFromUi();
        return true;
      }

      return handleSlashMenuKeyDownEvent(event, {
        editorRef,
        filteredSlashItemsRef,
        setSlashMenu,
        slashContextRef,
        slashMenuRef,
      });
    },
    [closeSlashMenuFromUi, editorRef],
  );

  return {
    closeSlashMenuFromUi,
    enabledSlashItems,
    filteredSlashItems,
    handleEditorKeyDown,
    openSlashMenuFromEditor,
    setSlashMenu,
    slashContextState,
    slashMenu,
  };
}
