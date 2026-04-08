"use client";

import { useMemo } from "react";
import type { SyntextState, DocumentRecord, Workspace } from "@/features/app-state/types";
import { getAccessEntries } from "@/features/editor/lib/utils";

export function useEditorAccessEntries(
  state: SyntextState,
  document: DocumentRecord,
  currentWorkspace: Workspace | null,
) {
  const currentWorkspaceUserIds = useMemo(
    () =>
      new Set(
        state.users
          .filter(
            (user) =>
              currentWorkspace &&
              (currentWorkspace.ownerUserId === user.id ||
                state.accesses.some((access) => {
                  const accessDocument = state.documents.find(
                    (item) => item.id === access.documentId,
                  );

                  return (
                    access.userId === user.id &&
                    accessDocument?.workspaceId === currentWorkspace.id &&
                    accessDocument.status !== "trashed"
                  );
                })),
          )
          .map((user) => user.id),
      ),
    [currentWorkspace, state.accesses, state.documents, state.users],
  );

  const accessEntries = useMemo(
    () => getAccessEntries(state, document, currentWorkspaceUserIds),
    [currentWorkspaceUserIds, document, state],
  );

  return {
    accessEntries,
    sharedAvatars: accessEntries.slice(0, 4),
  };
}
