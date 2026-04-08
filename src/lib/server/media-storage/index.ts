import { LocalMediaStorageAdapter } from "@/lib/server/media-storage/local-media-storage";
import { getMediaStorageConfig } from "@/lib/server/media-storage/config";
import type {
  MediaStorageAdapter,
} from "@/lib/server/media-storage/types";

export type {
  MediaStorageAdapter,
  MediaStorageBackend,
  ReadableMediaFile,
  StoredMediaFile,
  WriteMediaFileInput,
} from "@/lib/server/media-storage/types";
export { buildMediaSourceUrl, getMediaStorageConfig } from "@/lib/server/media-storage/config";

const localAdapter = new LocalMediaStorageAdapter();

export function getMediaStorageAdapter(): MediaStorageAdapter {
  const { backend } = getMediaStorageConfig();

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
