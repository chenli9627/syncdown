"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorSlashItems } from "@/features/editor/hooks/use-editor-slash-items";
import { useEditorSlashSync } from "@/features/editor/hooks/use-editor-slash-sync";
import {
  createInitialSlashMenuState,
  handleSlashMenuKeyDownEvent,
} from "@/features/editor/lib/slash-menu";
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

  const handleEditorKeyDown = useCallback(
    (event: KeyboardEvent) =>
      handleSlashMenuKeyDownEvent(event, {
        editorRef,
        filteredSlashItemsRef,
        setSlashMenu,
        slashContextRef,
        slashMenuRef,
      }),
    [editorRef],
  );

  return {
    enabledSlashItems,
    filteredSlashItems,
    handleEditorKeyDown,
    setSlashMenu,
    slashContextState,
    slashMenu,
  };
}
