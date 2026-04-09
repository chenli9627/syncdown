import type { StoredSyntextState } from "@/features/app-state/types";
import { getMediaStorageConfig } from "@/lib/server/media-storage/config";

const API_MEDIA_PATTERN = /\/api\/media\/([^"'?)\s>]+)/g;
const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const HTML_IMAGE_PATTERN = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;

export function collectReferencedMediaFileNames(state: StoredSyntextState) {
  const references = new Set<string>();

  for (const user of state.users) {
    for (const fileName of extractManagedMediaFileNames(user.avatarUrl)) {
      references.add(fileName);
    }
  }

  for (const document of state.documents) {
    for (const fileName of extractManagedMediaFileNames(document.content)) {
      references.add(fileName);
    }
  }

  return references;
}

export function extractManagedMediaFileNames(value: string | null | undefined) {
  if (!value) {
    return new Set<string>();
  }

  const matches = new Set<string>();
  const publicBaseUrl = getMediaStorageConfig().publicBaseUrl;
  const publicPrefix = publicBaseUrl ? `${publicBaseUrl}/` : null;

  const visit = (rawUrl: string) => {
    const fileName = resolveManagedMediaFileName(rawUrl, publicPrefix);

    if (fileName) {
      matches.add(fileName);
    }
  };

  for (const match of value.matchAll(API_MEDIA_PATTERN)) {
    visit(match[0]);
  }

  for (const match of value.matchAll(HTML_IMAGE_PATTERN)) {
    visit(match[1]);
  }

  for (const match of value.matchAll(MARKDOWN_IMAGE_PATTERN)) {
    visit(match[1]);
  }

  return matches;
}

export function normalizeManagedMediaUrl(value: string | null | undefined) {
  if (!value) {
    return value ?? null;
  }

  const fileName = resolveManagedMediaFileName(value, getPublicMediaPrefix());

  if (!fileName) {
    return value;
  }

  return `/api/media/${encodeURIComponent(fileName)}`;
}

export function normalizeManagedMediaContent(value: string) {
  if (!value) {
    return value;
  }

  return value.replace(HTML_IMAGE_PATTERN, (full, rawUrl: string) => {
    const normalized = normalizeManagedMediaUrl(rawUrl);

    if (!normalized || normalized === rawUrl) {
      return full;
    }

    return full.replace(rawUrl, normalized);
  });
}

export async function removeUnreferencedMediaFiles(
  previousState: StoredSyntextState,
  nextState: StoredSyntextState,
  candidateFileNames: Iterable<string>,
  deleteFile: (fileName: string) => Promise<void>,
) {
  const before = collectReferencedMediaFileNames(previousState);
  const after = collectReferencedMediaFileNames(nextState);
  const removals = new Set<string>();

  for (const candidate of candidateFileNames) {
    if (before.has(candidate) && !after.has(candidate)) {
      removals.add(candidate);
    }
  }

  await Promise.all(
    [...removals].map(async (fileName) => {
      try {
        await deleteFile(fileName);
      } catch {
        // Ignore cleanup failures so state writes still succeed.
      }
    }),
  );
}

function resolveManagedMediaFileName(rawUrl: string, publicPrefix: string | null) {
  if (!rawUrl) {
    return null;
  }

  const cleaned = rawUrl.trim();

  if (!cleaned) {
    return null;
  }

  let fileName: string | null = null;

  if (cleaned.startsWith("/api/media/")) {
    fileName = cleaned.slice("/api/media/".length);
  } else if (publicPrefix && cleaned.startsWith(publicPrefix)) {
    fileName = cleaned.slice(publicPrefix.length);
  } else {
    try {
      const parsed = new URL(cleaned);

      if (parsed.pathname.startsWith("/api/media/")) {
        fileName = parsed.pathname.slice("/api/media/".length);
      } else if (publicPrefix && cleaned.startsWith(publicPrefix)) {
        fileName = cleaned.slice(publicPrefix.length);
      }
    } catch {
      fileName = null;
    }
  }

  if (!fileName) {
    return null;
  }

  return decodeURIComponent(fileName.split(/[?#]/)[0] ?? "").trim() || null;
}

function getPublicMediaPrefix() {
  const publicBaseUrl = getMediaStorageConfig().publicBaseUrl;
  return publicBaseUrl ? `${publicBaseUrl}/` : null;
}
