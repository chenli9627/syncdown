import type { MediaStorageBackend } from "@/lib/server/media-storage/types";

export type MediaStorageConfig = {
  backend: MediaStorageBackend;
  publicBaseUrl: string | null;
};

export function getMediaStorageConfig(): MediaStorageConfig {
  const configuredBackend = process.env.STORAGE_BACKEND?.trim().toLowerCase();
  const backend: MediaStorageBackend = configuredBackend === "s3" ? "s3" : "local";
  const publicBaseUrl = normalizePublicBaseUrl(process.env.STORAGE_PUBLIC_BASE_URL);

  return {
    backend,
    publicBaseUrl,
  };
}

export function buildMediaSourceUrl(fileName: string) {
  const { publicBaseUrl } = getMediaStorageConfig();
  const encodedFileName = encodeURIComponent(fileName);

  if (publicBaseUrl) {
    return `${publicBaseUrl}/${encodedFileName}`;
  }

  return `/api/media/${encodedFileName}`;
}

function normalizePublicBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, "");
}
