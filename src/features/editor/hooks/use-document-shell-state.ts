"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useAppState } from "@/features/app-state/providers/app-state-provider";
import { getAccessPermission } from "@/features/editor/lib/utils";

export function useDocumentShellState(documentId: string) {
  const router = useRouter();
  const openedDocumentIdRef = useRef<string | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    currentUser,
    currentWorkspace,
    getDocument,
    openDocument,
    ready,
    saveDocument,
    state,
  } = useAppState();

  const rawDocument =
    state.documents.find((item) => item.id === documentId) ?? null;
  const document = getDocument(documentId);

  const permission = useMemo(() => {
    if (!currentUser || !rawDocument) {
      return null;
    }

    return getAccessPermission(state, currentUser, rawDocument);
  }, [currentUser, rawDocument, state]);

  useEffect(() => {
    openedDocumentIdRef.current = null;

    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
  }, [documentId]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!ready || !currentUser) {
      return;
    }

    if (rawDocument?.status === "trashed") {
      return;
    }

    if (rawDocument && !permission) {
      redirectTimeoutRef.current = setTimeout(() => {
        router.replace("/home");
      }, 1400);
      return;
    }

    if (openedDocumentIdRef.current === documentId) {
      return;
    }

    void (async () => {
      const result = await openDocument(documentId);

      if (!result.ok) {
        redirectTimeoutRef.current = setTimeout(() => {
          router.replace("/home");
        }, 1400);
        return;
      }

      openedDocumentIdRef.current = documentId;
    })();
  }, [currentUser, documentId, openDocument, permission, rawDocument, ready, router]);

  return {
    currentUser,
    currentWorkspace,
    document,
    permission,
    rawDocument,
    ready,
    saveDocument,
  };
}
