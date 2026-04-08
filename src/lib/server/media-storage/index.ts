import { LocalMediaStorageAdapter } from "@/lib/server/media-storage/local-media-storage";
import {
  getMediaStorageConfig,
  getS3MediaStorageConfig,
} from "@/lib/server/media-storage/config";
import { S3MediaStorageAdapter } from "@/lib/server/media-storage/s3-media-storage";
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
let s3Adapter: S3MediaStorageAdapter | null = null;

export function getMediaStorageAdapter(): MediaStorageAdapter {
  const { backend } = getMediaStorageConfig();

  if (backend === "local") {
    return localAdapter;
  }

  if (!s3Adapter) {
    s3Adapter = new S3MediaStorageAdapter(getS3MediaStorageConfig());
  }

  return s3Adapter;
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
