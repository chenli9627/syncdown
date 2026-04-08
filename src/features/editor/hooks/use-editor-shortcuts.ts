"use client";

import type { Editor } from "@tiptap/react";
import { useEffect } from "react";

type UseEditorShortcutsArgs = {
  canUndo: boolean;
  editor: Editor | null;
  searchMenuOpen: boolean;
  setOverflowMenuOpen: (value: boolean) => void;
  setPermissionMenuOpen: (value: boolean) => void;
  setSearchMenuOpen: (
    value: boolean | ((current: boolean) => boolean),
  ) => void;
};

export function useEditorShortcuts({
  canUndo,
  editor,
  searchMenuOpen,
  setOverflowMenuOpen,
  setPermissionMenuOpen,
  setSearchMenuOpen,
}: UseEditorShortcutsArgs) {
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        event.stopPropagation();
        setSearchMenuOpen((current) => !current);
        setOverflowMenuOpen(false);
        setPermissionMenuOpen(false);
        return;
      }

      if (event.key === "Escape" && searchMenuOpen) {
        event.preventDefault();
        event.stopPropagation();
        setSearchMenuOpen(false);
        return;
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "z" &&
        !isEditableTarget &&
        canUndo
      ) {
        event.preventDefault();
        editor?.chain().focus().undo().run();
      }
    }

    globalThis.document.addEventListener("keydown", handleShortcut);

    return () => {
      globalThis.document.removeEventListener("keydown", handleShortcut);
    };
  }, [
    canUndo,
    editor,
    searchMenuOpen,
    setOverflowMenuOpen,
    setPermissionMenuOpen,
    setSearchMenuOpen,
  ]);
}
