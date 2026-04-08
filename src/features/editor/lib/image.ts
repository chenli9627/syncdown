"use client";

import type { Editor } from "@tiptap/react";
import {
  MAX_IMAGE_FILE_SIZE,
  isSupportedImageMimeType,
} from "@/features/editor/lib/image-shared";

export function isSupportedImageFile(file: File) {
  return isSupportedImageMimeType(file.type);
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

export async function uploadImageBlob(blob: Blob, fileName: string) {
  if (!isSupportedImageMimeType(blob.type)) {
    return {
      error: "Unsupported image format",
      ok: false as const,
    };
  }

  if (blob.size > MAX_IMAGE_FILE_SIZE) {
    return {
      error: "Image is too large",
      ok: false as const,
    };
  }

  const formData = new FormData();
  formData.append("file", new File([blob], fileName, { type: blob.type }));

  const response = await fetch("/api/media", {
    body: formData,
    method: "POST",
  });
  const data = (await response.json().catch(() => null)) as
    | { error?: string; ok?: boolean; src?: string }
    | null;

  if (!response.ok || !data?.ok || !data.src) {
    return {
      error: data?.error ?? "Failed to upload image",
      ok: false as const,
    };
  }

  return {
    ok: true as const,
    src: data.src,
  };
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

  const upload = await uploadImageBlob(file, file.name);

  if (!upload.ok) {
    return upload;
  }

  const position =
    options?.position != null
      ? Math.max(0, Math.min(options.position, editor.state.doc.content.size))
      : null;
  const chain = position != null
    ? editor.chain().focus().setTextSelection(position)
    : editor.chain().focus();

  chain.setImage({
    alt: file.name,
    src: upload.src,
    title: file.name,
  }).run();

  return {
    ok: true as const,
  };
}
