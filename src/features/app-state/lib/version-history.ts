import type {
  DocumentVersion,
  StoredSyntextState,
} from "@/features/app-state/types";

export function migrateStoredStateVersionHistory(state: StoredSyntextState) {
  let changed = false;
  const documents = state.documents.map((document) => {
    const versionHistory = deduplicateVersionHistory(document.versionHistory);

    if (versionHistory === document.versionHistory) {
      return document;
    }

    changed = true;
    return {
      ...document,
      versionHistory,
    };
  });

  return {
    changed,
    state: changed
      ? {
          ...state,
          documents,
        }
      : state,
  };
}

function deduplicateVersionHistory(versionHistory: DocumentVersion[] | undefined) {
  if (!versionHistory?.length) {
    return versionHistory;
  }

  const seen = new Set<string>();
  const deduplicated: DocumentVersion[] = [];

  for (const version of versionHistory) {
    const key = `${version.title}\n${normalizeVersionContent(version.content)}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduplicated.push(version);
  }

  return deduplicated.length === versionHistory.length ? versionHistory : deduplicated;
}

function normalizeVersionContent(content: string) {
  return decodeHtmlEntities(content)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote|pre)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n+/g, "\n")
    .trim();
}

function decodeHtmlEntities(content: string) {
  return content
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, value: string) => {
      const codePoint = Number.parseInt(value, 10);

      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : "";
    })
    .replace(/&#x([\da-f]+);/gi, (_match, value: string) => {
      const codePoint = Number.parseInt(value, 16);

      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : "";
    });
}
