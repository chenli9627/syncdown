"use client";

import { useEffect, useMemo, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import type { User } from "@/features/app-state/types";
import type { PresenceParticipant } from "@/features/editor/lib/types";

const PRESENCE_COLORS = [
  "#2383e2",
  "#c2410c",
  "#7c3aed",
  "#15803d",
  "#be185d",
  "#0369a1",
];

type AwarenessUser = {
  avatarUrl?: string | null;
  color: string;
  name: string;
  userId: string;
};

type AwarenessCursor = {
  anchor: unknown;
  head: unknown;
};

export type RemoteAwarenessEntry = {
  avatarUrl: string | null;
  color: string;
  head: unknown | null;
  name: string;
  userId: string;
};

type AwarenessState = {
  cursor?: AwarenessCursor | null;
  user?: AwarenessUser | null;
};

type UseEditorCollaborationArgs = {
  currentUser: User | null;
  documentId: string;
};

function colorForUser(userId: string) {
  let hash = 0;

  for (const char of userId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

function getCollabServerUrl() {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_COLLAB_URL ?? "ws://127.0.0.1:1234";
  }

  const configured = process.env.NEXT_PUBLIC_COLLAB_URL?.trim();

  if (configured) {
    return configured;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.hostname;
  const port = process.env.NEXT_PUBLIC_COLLAB_PORT?.trim() || "1234";

  return `${protocol}://${host}:${port}`;
}

function toRemoteEntries(
  awareness: HocuspocusProvider["awareness"],
  currentUserId: string | null,
) {
  if (!awareness) {
    return [];
  }

  const nextEntriesByUserId = new Map<string, RemoteAwarenessEntry>();

  awareness.getStates().forEach((rawState) => {
    const state = rawState as AwarenessState;
    const user = state.user;

    if (!user || user.userId === currentUserId) {
      return;
    }

    const nextEntry: RemoteAwarenessEntry = {
      avatarUrl: user.avatarUrl ?? null,
      color: user.color,
      head: state.cursor?.head ?? null,
      name: user.name,
      userId: user.userId,
    };

    const currentEntry = nextEntriesByUserId.get(user.userId);

    if (!currentEntry) {
      nextEntriesByUserId.set(user.userId, nextEntry);
      return;
    }

    const currentHasHead = currentEntry.head != null;
    const nextHasHead = nextEntry.head != null;

    if (!currentHasHead && nextHasHead) {
      nextEntriesByUserId.set(user.userId, nextEntry);
      return;
    }

    if (currentHasHead && !nextHasHead) {
      return;
    }

    nextEntriesByUserId.set(user.userId, nextEntry);
  });

  return Array.from(nextEntriesByUserId.values());
}

export function useEditorCollaboration({
  currentUser,
  documentId,
}: UseEditorCollaborationArgs) {
  const [collaborationDocument, setCollaborationDocument] = useState<Y.Doc | null>(null);
  const [collaborationProvider, setCollaborationProvider] =
    useState<HocuspocusProvider | null>(null);
  const [collaborationSynced, setCollaborationSynced] = useState(false);
  const [remoteEntries, setRemoteEntries] = useState<RemoteAwarenessEntry[]>([]);
  const currentUserId = currentUser?.id ?? null;
  const currentUserName = currentUser?.name ?? null;
  const currentUserAvatarUrl = currentUser?.avatarUrl ?? null;

  useEffect(() => {
    if (!currentUserId || !currentUserName) {
      const timer = window.setTimeout(() => {
        setCollaborationSynced(false);
        setRemoteEntries([]);
      }, 0);

      return () => {
        window.clearTimeout(timer);
      };
    }

    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({
      document: doc,
      name: `document-${documentId}`,
      onSynced: () => {
        setCollaborationSynced(true);
      },
      url: getCollabServerUrl(),
    });

    let active = true;
    const publishHandle = window.setTimeout(() => {
      if (!active) {
        return;
      }

      setCollaborationProvider(provider);
      setCollaborationDocument(doc);
    }, 0);

    const awareness = provider.awareness;

    if (!awareness) {
      return () => {
        setCollaborationSynced(false);
        provider.destroy();
        doc.destroy();
        setCollaborationProvider((current) => (current === provider ? null : current));
        setCollaborationDocument((current) => (current === doc ? null : current));
      };
    }

    const syncEntries = () => {
      setRemoteEntries(toRemoteEntries(awareness, currentUserId));
    };

    provider.setAwarenessField("user", {
      avatarUrl: currentUserAvatarUrl,
      color: colorForUser(currentUserId),
      name: currentUserName,
      userId: currentUserId,
    } satisfies AwarenessUser);
    awareness.on("change", syncEntries);
    syncEntries();

    return () => {
      active = false;
      window.clearTimeout(publishHandle);
      setCollaborationSynced(false);
      awareness.off("change", syncEntries);
      awareness.setLocalState(null);
      provider.destroy();
      doc.destroy();
      setCollaborationProvider((current) => (current === provider ? null : current));
      setCollaborationDocument((current) => (current === doc ? null : current));
      setRemoteEntries([]);
    };
  }, [currentUserAvatarUrl, currentUserId, currentUserName, documentId]);

  const remoteParticipants = useMemo<PresenceParticipant[]>(
    () =>
      remoteEntries.map((entry) => ({
        avatarUrl: entry.avatarUrl,
        color: entry.color,
        name: entry.name,
        userId: entry.userId,
      })),
    [remoteEntries],
  );

  return {
    collaborationDocument,
    collaborationProvider,
    collaborationSynced,
    remoteEntries,
    remoteParticipants,
  };
}
