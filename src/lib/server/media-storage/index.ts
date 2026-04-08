import { LocalMediaStorageAdapter } from "@/lib/server/media-storage/local-media-storage";
import type {
  MediaStorageAdapter,
  MediaStorageBackend,
} from "@/lib/server/media-storage/types";

export type {
  MediaStorageAdapter,
  MediaStorageBackend,
  ReadableMediaFile,
  StoredMediaFile,
  WriteMediaFileInput,
} from "@/lib/server/media-storage/types";

const localAdapter = new LocalMediaStorageAdapter();

export function getMediaStorageBackend(): MediaStorageBackend {
  const configured = process.env.STORAGE_BACKEND?.trim().toLowerCase();

  if (configured === "s3") {
    return "s3";
  }

  return "local";
}

export function getMediaStorageAdapter(): MediaStorageAdapter {
  const backend = getMediaStorageBackend();

  if (backend === "local") {
    return localAdapter;
  }

  throw new Error(
    "The configured S3-compatible storage backend is not available in the current build yet.",
  );
}

export function inferMimeTypeFromExtension(extension: string) {
  switch (extension.toLowerCase()) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}
