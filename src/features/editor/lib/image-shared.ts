export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export function isSupportedImageMimeType(mimeType: string) {
  return ALLOWED_IMAGE_TYPES.has(mimeType);
}

