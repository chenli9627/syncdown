"use client";

import type { Editor } from "@tiptap/react";

export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export function isSupportedImageFile(file: File) {
  return ALLOWED_IMAGE_TYPES.has(file.type);
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read image"));
    };

    reader.onerror = () => {
      reject(new Error("Failed to read image"));
    };

    reader.readAsDataURL(file);
  });
}

export async function insertImageFile(
  editor: Editor,
  file: File,
  options?: {
    position?: number;
  },
) {
  if (!isSupportedImageFile(file)) {
    return {
      error: "Unsupported image format",
      ok: false as const,
    };
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return {
      error: "Image is too large",
      ok: false as const,
    };
  }

  const src = await readFileAsDataUrl(file);
  const position =
    options?.position != null
      ? Math.max(0, Math.min(options.position, editor.state.doc.content.size))
      : null;
  const chain = position != null
    ? editor.chain().focus().setTextSelection(position)
    : editor.chain().focus();

  chain.setImage({
    alt: file.name,
    src,
    title: file.name,
  }).run();

  return {
    ok: true as const,
  };
}
