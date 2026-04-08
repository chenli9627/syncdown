"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@/features/app-state/types";
import type { RemoteCursorMarker, PresenceEntry } from "@/features/editor/lib/types";

const PRESENCE_COLORS = [
  "#2383e2",
  "#c2410c",
  "#7c3aed",
  "#15803d",
  "#be185d",
  "#0369a1",
];

function colorForUser(userId: string) {
  let hash = 0;

  for (const char of userId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

function clampPresencePos(editor: Editor, position: number) {
  const max = editor.state.doc.content.size;

  if (max <= 0) {
    return 1;
  }

  return Math.min(Math.max(position, 1), max);
}

type UseEditorPresenceArgs = {
  currentUser: User | null;
  documentId: string;
  editor: Editor | null;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
};

export function useEditorPresence({
  currentUser,
  documentId,
  editor,
  editorContainerRef,
}: UseEditorPresenceArgs) {
  const [entries, setEntries] = useState<PresenceEntry[]>([]);
  const [markers, setMarkers] = useState<RemoteCursorMarker[]>([]);
  const publishTimeoutRef = useRef<number | null>(null);

  const publishPresence = useCallback(async () => {
    if (!editor || !currentUser) {
      return;
    }

    const selection = editor.state.selection;
    await fetch(`/api/presence/${documentId}`, {
      body: JSON.stringify({
        anchor: selection.anchor,
        head: selection.head,
        name: currentUser.name,
        userId: currentUser.id,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => undefined);
  }, [currentUser, documentId, editor]);

  const removePresence = useCallback(() => {
    if (!currentUser) {
      return;
    }

    void fetch(`/api/presence/${documentId}`, {
      body: JSON.stringify({ userId: currentUser.id }),
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      method: "DELETE",
    }).catch(() => undefined);
  }, [currentUser, documentId]);

  const refreshPresence = useCallback(async () => {
    if (!currentUser) {
      return;
    }

    const response = await fetch(`/api/presence/${documentId}`, {
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      return;
    }

    const data = (await response.json()) as { records?: PresenceEntry[] };
    setEntries((data.records ?? []).filter((entry) => entry.userId !== currentUser.id));
  }, [currentUser, documentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEntries([]);
      setMarkers([]);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [documentId]);

  useEffect(() => {
    if (!editor || !currentUser) {
      return;
    }

    const schedulePublish = () => {
      if (publishTimeoutRef.current) {
        window.clearTimeout(publishTimeoutRef.current);
      }

      publishTimeoutRef.current = window.setTimeout(() => {
        void publishPresence();
      }, 120);
    };

    schedulePublish();
    const initialRefresh = window.setTimeout(() => {
      void refreshPresence();
    }, 0);
    editor.on("selectionUpdate", schedulePublish);
    editor.on("focus", schedulePublish);

    return () => {
      window.clearTimeout(initialRefresh);
      editor.off("selectionUpdate", schedulePublish);
      editor.off("focus", schedulePublish);

      if (publishTimeoutRef.current) {
        window.clearTimeout(publishTimeoutRef.current);
      }
    };
  }, [currentUser, editor, publishPresence, refreshPresence]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const initialRefresh = window.setTimeout(() => {
      void refreshPresence();
    }, 0);
    const intervalId = window.setInterval(() => {
      void refreshPresence();
    }, 2000);

    const handlePageHide = () => {
      removePresence();
    };

    window.addEventListener("focus", refreshPresence);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshPresence);
      window.removeEventListener("pagehide", handlePageHide);
      removePresence();
    };
  }, [currentUser, refreshPresence, removePresence]);

  const markerDependencies = useMemo(
    () =>
      entries.map((entry) => `${entry.userId}:${entry.head}:${entry.updatedAt}`).join("|"),
    [entries],
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

      for (const entry of entries) {
        try {
          const coords = editor.view.coordsAtPos(clampPresencePos(editor, entry.head));
          nextMarkers.push({
            color: colorForUser(entry.userId),
            label: entry.name,
            left: coords.left - containerBounds.left,
            top: coords.top - containerBounds.top,
            userId: entry.userId,
          });
        } catch {
          // Ignore stale positions against newer local content.
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
  }, [editor, editorContainerRef, markerDependencies, entries]);

  return {
    remoteCursorMarkers: markers,
  };
}
