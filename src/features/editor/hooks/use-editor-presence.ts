"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@/features/app-state/types";
import type {
  PresenceEntry,
  PresenceParticipant,
  RemoteCursorMarker,
} from "@/features/editor/lib/types";

const PRESENCE_COLORS = [
  "#2383e2",
  "#c2410c",
  "#7c3aed",
  "#15803d",
  "#be185d",
  "#0369a1",
];
const HEARTBEAT_INTERVAL_MS = 3_000;
const REFRESH_INTERVAL_MS = 3_000;

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
  const currentUserId = currentUser?.id ?? null;
  const currentUserName = currentUser?.name ?? null;
  const currentUserAvatarUrl = currentUser?.avatarUrl ?? null;
  const presenceIdentityRef = useRef<{
    documentId: string;
    userId: string;
  } | null>(null);

  const publishPresence = useCallback(async () => {
    if (!editor || !currentUserId || !currentUserName) {
      return;
    }

    const selection = editor.state.selection;
    await fetch(`/api/presence/${documentId}`, {
      body: JSON.stringify({
        anchor: selection.anchor,
        avatarUrl: currentUserAvatarUrl,
        head: selection.head,
        name: currentUserName,
        userId: currentUserId,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => undefined);
  }, [currentUserAvatarUrl, currentUserId, currentUserName, documentId, editor]);

  const removePresenceByIdentity = useCallback((identity: { documentId: string; userId: string }) => {
    void fetch(`/api/presence/${identity.documentId}`, {
      body: JSON.stringify({ userId: identity.userId }),
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      method: "DELETE",
    }).catch(() => undefined);
  }, []);

  const refreshPresence = useCallback(async () => {
    if (!currentUserId) {
      return;
    }

    const response = await fetch(`/api/presence/${documentId}`, {
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      return;
    }

    const data = (await response.json()) as { records?: PresenceEntry[] };
    setEntries((data.records ?? []).filter((entry) => entry.userId !== currentUserId));
  }, [currentUserId, documentId]);

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
    presenceIdentityRef.current = currentUserId
      ? { documentId, userId: currentUserId }
      : null;
  }, [currentUserId, documentId]);

  useEffect(() => {
    if (!editor || !currentUserId) {
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
  }, [currentUserId, editor, publishPresence, refreshPresence]);

  useEffect(() => {
    if (!editor || !currentUserId) {
      return;
    }

    const heartbeatId = window.setInterval(() => {
      void publishPresence();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(heartbeatId);
    };
  }, [currentUserId, editor, publishPresence]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const initialRefresh = window.setTimeout(() => {
      void refreshPresence();
    }, 0);
    const intervalId = window.setInterval(() => {
      void refreshPresence();
    }, REFRESH_INTERVAL_MS);

    const handlePageHide = () => {
      const identity = presenceIdentityRef.current;

      if (identity) {
        removePresenceByIdentity(identity);
      }
    };
    const handleFocus = () => {
      void publishPresence();
      void refreshPresence();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void publishPresence();
        void refreshPresence();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUserId, publishPresence, refreshPresence, removePresenceByIdentity]);

  useEffect(() => {
    return () => {
      const identity = presenceIdentityRef.current;

      if (identity) {
        removePresenceByIdentity(identity);
      }
    };
  }, [removePresenceByIdentity]);

  const markerDependencies = useMemo(
    () =>
      entries.map((entry) => `${entry.userId}:${entry.head}:${entry.updatedAt}`).join("|"),
    [entries],
  );
  const participants = useMemo<PresenceParticipant[]>(
    () =>
      entries.map((entry) => ({
        avatarUrl: entry.avatarUrl ?? null,
        color: colorForUser(entry.userId),
        name: entry.name,
        userId: entry.userId,
      })),
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
    remoteParticipants: participants,
    remoteCursorMarkers: markers,
  };
}
