"use client";

import type { DocumentRecord } from "@/features/app-state/types";
import {
  diffVersionText,
  htmlToVersionText,
} from "@/features/editor/lib/version-history";

type DocumentUpdateImageLabels = { single: string; plural: (count: number) => string };

export type DocumentUpdatePart = {
  text: string;
  type: "added" | "removed";
};

export type DocumentUpdateEntry = {
  id: string;
  createdAt: string;
  parts: DocumentUpdatePart[];
  userId: string;
};

export function getDocumentUpdateEntries(
  document: Pick<DocumentRecord, "versionHistory">,
  imageLabels?: DocumentUpdateImageLabels,
): DocumentUpdateEntry[] {
  const versions = document.versionHistory ?? [];

  return versions.map((version, index) => {
    const previousVersion = versions[index + 1] ?? null;
    const previousText = previousVersion
      ? htmlToVersionText(previousVersion.content, imageLabels)
      : "";
    const currentText = htmlToVersionText(version.content, imageLabels);
    const parts = diffVersionText(previousText, currentText).filter(
      (part): part is DocumentUpdatePart =>
        part.type !== "unchanged" && part.text.trim() !== "",
    );

    return {
      createdAt: version.createdAt,
      id: version.id,
      parts,
      userId: version.userId,
    };
  });
}
