"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSlashItems } from "@/features/editor/lib/menu-config";
import type { SlashContext, SlashItem } from "@/features/editor/lib/types";
import { getSlashContext } from "@/features/editor/lib/utils";

type SlashMenuState = {
  activeIndex: number;
  left: number;
  open: boolean;
  query: string;
  top: number;
  placement: "above" | "below";
};

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
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>({
    activeIndex: 0,
    left: 0,
    open: false,
    query: "",
    top: 0,
    placement: "below",
  });
  const slashMenuRef = useRef(slashMenu);
  const slashContextRef = useRef<SlashContext | null>(null);
  const filteredSlashItemsRef = useRef<SlashItem[]>([]);

  const slashItems = useMemo<SlashItem[]>(() => createSlashItems(), []);

  const filteredSlashItems = useMemo(() => {
    const normalizedQuery = slashMenu.query.trim().toLowerCase();

    if (!normalizedQuery) {
      return slashItems;
    }

    return slashItems.filter(
      (item) =>
        item.label.toLowerCase().includes(normalizedQuery) ||
        item.shortcut.toLowerCase().includes(normalizedQuery),
    );
  }, [slashItems, slashMenu.query]);

  const enabledSlashItems = useMemo(
    () => filteredSlashItems.filter((item) => item.enabled),
    [filteredSlashItems],
  );

  useEffect(() => {
    slashMenuRef.current = slashMenu;
  }, [slashMenu]);

  useEffect(() => {
    filteredSlashItemsRef.current = filteredSlashItems;
  }, [filteredSlashItems]);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor || !canEditBody) {
      return;
    }

    const syncSlashMenu = () => {
      if (!editor.isFocused) {
        slashContextRef.current = null;
        setSlashContextState(null);
        setSlashMenu((current) => ({
          ...current,
          activeIndex: 0,
          open: false,
          placement: "below",
          query: "",
        }));
        return;
      }

      const slashContext = getSlashContext(editor);

      if (!slashContext) {
        slashContextRef.current = null;
        setSlashContextState(null);
        setSlashMenu((current) => ({
          ...current,
          activeIndex: 0,
          open: false,
          placement: "below",
          query: "",
        }));
        return;
      }

      const container = editorContainerRef.current;

      if (!container) {
        return;
      }

      const coords = editor.view.coordsAtPos(editor.state.selection.from);
      const bounds = container.getBoundingClientRect();
      const estimatedMenuHeight = Math.min(filteredSlashItemsRef.current.length * 38 + 10, 260);
      const spaceBelow = window.innerHeight - coords.bottom;
      const placeAbove = spaceBelow < estimatedMenuHeight + 16 && coords.top > estimatedMenuHeight;
      const nextTop = placeAbove
        ? coords.top - bounds.top - estimatedMenuHeight - 10
        : coords.bottom - bounds.top + 10;
      const nextLeft = Math.max(
        12,
        Math.min(coords.left - bounds.left, bounds.width - 228),
      );

      slashContextRef.current = slashContext;
      setSlashContextState(slashContext);
      setSlashMenu((current) => ({
        activeIndex:
          current.query !== slashContext.query || !current.open ? 0 : current.activeIndex,
        left: nextLeft,
        open: true,
        placement: placeAbove ? "above" : "below",
        query: slashContext.query,
        top: Math.max(12, nextTop),
      }));
    };

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
  }, [canEditBody, editorContainerRef, editorReadyVersion, editorRef]);

  const handleEditorKeyDown = (event: KeyboardEvent) => {
    if (!slashMenuRef.current.open) {
      return false;
    }

    const enabledItems = filteredSlashItemsRef.current.filter((item) => item.enabled);

    if (!enabledItems.length) {
      return false;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSlashMenu((current) => ({
        ...current,
        activeIndex: (current.activeIndex + 1) % enabledItems.length,
      }));
      return true;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSlashMenu((current) => ({
        ...current,
        activeIndex:
          (current.activeIndex - 1 + enabledItems.length) % enabledItems.length,
      }));
      return true;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const item = enabledItems[slashMenuRef.current.activeIndex] ?? enabledItems[0];
      const slashContext = slashContextRef.current;
      const editor = editorRef.current;

      if (!item || !slashContext || !editor) {
        return true;
      }

      editor
        .chain()
        .focus()
        .deleteRange({ from: slashContext.from, to: slashContext.to })
        .run();
      item.run(editor);
      setSlashMenu((current) => ({
        ...current,
        activeIndex: 0,
        open: false,
        placement: "below",
        query: "",
      }));
      return true;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setSlashMenu((current) => ({
        ...current,
        activeIndex: 0,
        open: false,
        placement: "below",
        query: "",
      }));
      return true;
    }

    return false;
  };

  return {
    enabledSlashItems,
    filteredSlashItems,
    handleEditorKeyDown,
    setSlashMenu,
    slashContextState,
    slashMenu,
  };
}
