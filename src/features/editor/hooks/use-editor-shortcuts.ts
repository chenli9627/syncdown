"use client";

import { Selection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";

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
  const redoSelectionStackRef = useRef<object[]>([]);
  const undoSelectionStackRef = useRef<object[]>([]);
  const historyActionRef = useRef<"redo" | "undo" | null>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleTransaction = ({
      transaction,
    }: {
      transaction: { docChanged: boolean };
    }) => {
      if (!transaction.docChanged || historyActionRef.current) {
        return;
      }

      redoSelectionStackRef.current = [];
      undoSelectionStackRef.current = [];
    };

    editor.on("transaction", handleTransaction);

    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [editor]);

  useEffect(() => {
    function restoreSelection(selectionJson: object | undefined) {
      if (!editor || !selectionJson) {
        return;
      }

      const applySelection = () => {
        try {
          const selection = Selection.fromJSON(editor.state.doc, selectionJson);
          editor.view.dispatch(editor.state.tr.setSelection(selection));
          editor.view.focus();
        } catch {
          // Ignore stale selections that no longer map to the current doc shape.
        }
      };

      applySelection();
      window.requestAnimationFrame(applySelection);
    }

    function handleShortcut(event: KeyboardEvent) {
      const target = event.target;
      const targetElement = target instanceof HTMLElement ? target : null;
      const isEditorTarget = Boolean(targetElement?.closest(".ProseMirror"));
      const isEditableTarget =
        targetElement != null &&
        (targetElement.tagName === "INPUT" ||
          targetElement.tagName === "TEXTAREA" ||
          targetElement.isContentEditable);

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
        const selectionBeforeUndo = editor?.state.selection.toJSON();
        historyActionRef.current = "undo";
        editor?.commands.undo();
        historyActionRef.current = null;
        restoreSelection(undoSelectionStackRef.current.pop());

        if (selectionBeforeUndo) {
          redoSelectionStackRef.current.push(selectionBeforeUndo);
        }
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        ((event.key.toLowerCase() === "y" && !event.shiftKey) ||
          (event.key.toLowerCase() === "z" && event.shiftKey)) &&
        (isEditorTarget || !isEditableTarget)
      ) {
        event.preventDefault();
        const selectionBeforeRedo = editor?.state.selection.toJSON();
        historyActionRef.current = "redo";
        editor?.commands.redo();
        historyActionRef.current = null;
        restoreSelection(redoSelectionStackRef.current.pop());

        if (selectionBeforeRedo) {
          undoSelectionStackRef.current.push(selectionBeforeRedo);
        }
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
