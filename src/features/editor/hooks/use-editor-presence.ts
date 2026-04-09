"use client";

import type { Editor } from "@tiptap/react";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RemoteAwarenessEntry } from "@/features/editor/hooks/use-editor-collaboration";

type RemoteCursorMarker = {
  color: string;
  label: string;
  left: number;
  top: number;
  userId: string;
};

function clampPresencePos(editor: Editor, position: number) {
  const max = editor.state.doc.content.size;

  if (max <= 0) {
    return 1;
  }

  return Math.min(Math.max(position, 1), max);
}

type UseEditorPresenceArgs = {
  collaborationProvider: HocuspocusProvider | null;
  editor: Editor | null;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  remoteEntries: RemoteAwarenessEntry[];
};

export function useEditorPresence({
  collaborationProvider,
  editor,
  editorContainerRef,
  remoteEntries,
}: UseEditorPresenceArgs) {
  const [markers, setMarkers] = useState<RemoteCursorMarker[]>([]);

  const clearCursor = useCallback(() => {
    collaborationProvider?.awareness?.setLocalStateField("cursor", null);
  }, [collaborationProvider]);

  useEffect(() => {
    if (!collaborationProvider || !editor) {
      return;
    }

    const publishSelection = () => {
      if (!collaborationProvider.awareness) {
        return;
      }

      const selection = editor.state.selection;

      collaborationProvider.awareness.setLocalStateField("cursor", {
        anchor: selection.anchor,
        head: selection.head,
      });
    };

    publishSelection();
    editor.on("selectionUpdate", publishSelection);
    editor.on("focus", publishSelection);
    editor.on("blur", clearCursor);

    const handleFocus = () => {
      publishSelection();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        publishSelection();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      editor.off("selectionUpdate", publishSelection);
      editor.off("focus", publishSelection);
      editor.off("blur", clearCursor);
      clearCursor();
    };
  }, [clearCursor, collaborationProvider, editor]);

  const markerDependencies = useMemo(
    () => remoteEntries.map((entry) => `${entry.userId}:${entry.head ?? "none"}`).join("|"),
    [remoteEntries],
  );

  useEffect(() => {
    if (!editor) {
      const timer = window.setTimeout(() => {
        setMarkers([]);
      }, 0);

      return () => {
        window.clearTimeout(timer);
      };
    }

    const computeMarkers = () => {
      const container = editorContainerRef.current;

      if (!(container instanceof HTMLElement)) {
        setMarkers([]);
        return;
      }

      const containerBounds = container.getBoundingClientRect();
      const nextMarkers: RemoteCursorMarker[] = [];

      for (const entry of remoteEntries) {
        if (entry.head == null) {
          continue;
        }

        try {
          const coords = editor.view.coordsAtPos(clampPresencePos(editor, entry.head));
          nextMarkers.push({
            color: entry.color,
            label: entry.name,
            left: coords.left - containerBounds.left,
            top: coords.top - containerBounds.top,
            userId: entry.userId,
          });
        } catch {
          // Ignore stale cursor positions while local content diverges.
        }
      }

      setMarkers(nextMarkers);
    };

    computeMarkers();
    editor.on("transaction", computeMarkers);
    window.addEventListener("resize", computeMarkers);
    const scrollHost = editorContainerRef.current?.closest("main");
    scrollHost?.addEventListener("scroll", computeMarkers);

    return () => {
      editor.off("transaction", computeMarkers);
      window.removeEventListener("resize", computeMarkers);
      scrollHost?.removeEventListener("scroll", computeMarkers);
    };
  }, [editor, editorContainerRef, markerDependencies, remoteEntries]);

  return {
    remoteCursorMarkers: markers,
  };
}
