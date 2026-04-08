import type { MediaStorageBackend } from "@/lib/server/media-storage/types";

export type MediaStorageConfig = {
  backend: MediaStorageBackend;
  publicBaseUrl: string | null;
};

export type S3MediaStorageConfig = {
  accessKeyId: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle: boolean;
  region: string;
  secretAccessKey: string;
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
  const encodedFileName = encodeURIComponent(fileName);

  return `/api/media/${encodedFileName}`;
}

export function getS3MediaStorageConfig(): S3MediaStorageConfig {
  const bucket = process.env.STORAGE_BUCKET?.trim();
  const region = process.env.STORAGE_REGION?.trim();
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY?.trim();

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3-compatible storage is missing one or more required environment variables.",
    );
  }

  return {
    accessKeyId,
    bucket,
    endpoint: process.env.STORAGE_ENDPOINT?.trim() || undefined,
    forcePathStyle: normalizeForcePathStyle(process.env.STORAGE_FORCE_PATH_STYLE),
    region,
    secretAccessKey,
  };
}

function normalizePublicBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, "");
}

function normalizeForcePathStyle(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return !["0", "false", "no"].includes(normalized);
}
