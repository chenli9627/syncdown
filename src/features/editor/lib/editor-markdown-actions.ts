import {
  editorHtmlToMarkdown,
  editorHtmlToMarkdownBundle,
  getMarkdownImportLimit,
  inferMimeTypeFromPath,
  isLocalMediaSource,
  markdownToEditorHtml,
  markdownToEditorHtmlWithAssets,
  normalizeZipPath,
  sanitizeMarkdownFilename,
  sanitizeZipFilename,
  validateSupportedMarkdown,
} from "@/features/editor/lib/markdown";
import type { EditorActionBaseArgs } from "@/features/editor/lib/editor-action-types";
import { uploadImageBlob } from "@/features/editor/lib/image";
import { isSupportedImageMimeType } from "@/features/editor/lib/image-shared";
import type { Locale, MessageKey } from "@/lib/i18n/messages";
import { translateAppError } from "@/lib/i18n/error-messages";
import JSZip from "jszip";

type MarkdownActionI18nArgs = {
  locale: Locale;
  t: (key: MessageKey) => string;
};

export function exportEditorMarkdown({
  document,
  editor,
  locale,
  setActionError,
  setActionNotice,
  setOverflowMenuOpen,
  t,
}: Pick<
  EditorActionBaseArgs,
  "document" | "editor" | "setActionError" | "setActionNotice" | "setOverflowMenuOpen"
> &
  MarkdownActionI18nArgs) {
  const html = editor?.getHTML() ?? document.content;

  if (containsEmbeddedImages(html)) {
    return exportEditorMarkdownZipInternal({
      document,
      editor,
      locale,
      setActionError,
      setActionNotice,
      t,
    });
  }

  const markdown = editorHtmlToMarkdown(html);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = sanitizeMarkdownFilename(document.title);
  anchor.click();
  URL.revokeObjectURL(downloadUrl);
  setOverflowMenuOpen?.(false);
  setActionError(null);
  setActionNotice(null);
}

export async function importEditorMarkdown(
  args: EditorActionBaseArgs & MarkdownActionI18nArgs,
  file: File,
) {
  if (!args.canEditBody) {
    args.setOverflowMenuOpen?.(false);
    args.setActionError(translateAppError("You do not have permission to import", args.t, args.locale));
    args.setActionNotice(null);
    return;
  }
  const lowerName = file.name.toLowerCase();

  if (!lowerName.endsWith(".md") && !lowerName.endsWith(".zip")) {
    args.setOverflowMenuOpen?.(false);
    args.setActionError(
      translateAppError("Only .md and .zip files are supported", args.t, args.locale),
    );
    args.setActionNotice(null);
    return;
  }

  if (file.size > getMarkdownImportLimit(file.name)) {
    args.setOverflowMenuOpen?.(false);
    args.setActionError(translateAppError("上传文件过大", args.t, args.locale));
    args.setActionNotice(null);
    return;
  }

  if (lowerName.endsWith(".zip")) {
    await importMarkdownZip(args, file);
    return;
  }

  const markdown = await file.text();
  const validation = validateSupportedMarkdown(markdown);

  if (!validation.ok) {
    args.setOverflowMenuOpen?.(false);
    args.setActionError(translateAppError(validation.error, args.t, args.locale));
    args.setActionNotice(null);
    return;
  }

  await insertMarkdownIntoEditor(args, markdownToEditorHtml(markdown), args.t("importMdZip"));
}

async function exportEditorMarkdownZipInternal({
  document,
  editor,
  setActionError,
  setActionNotice,
  setOverflowMenuOpen,
}: Pick<
  EditorActionBaseArgs,
  "document" | "editor" | "setActionError" | "setActionNotice" | "setOverflowMenuOpen"
> &
  MarkdownActionI18nArgs) {
  const html = editor?.getHTML() ?? document.content;
  const { assets, markdown } = await editorHtmlToMarkdownBundle(html);
  const zip = new JSZip();
  zip.file("page.md", markdown);

  for (const asset of assets) {
    zip.file(asset.path, asset.data);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = sanitizeZipFilename(document.title);
  anchor.click();
  URL.revokeObjectURL(downloadUrl);
  setOverflowMenuOpen?.(false);
  setActionError(null);
  setActionNotice(null);
}

async function importMarkdownZip(
  args: EditorActionBaseArgs & MarkdownActionI18nArgs,
  file: File,
) {
  const zip = await JSZip.loadAsync(file);
  const markdownEntries = getMarkdownEntries(zip);

  if (markdownEntries.length === 0) {
    args.setOverflowMenuOpen?.(false);
    args.setActionError(
      translateAppError("Zip archive does not contain a Markdown file", args.t, args.locale),
    );
    args.setActionNotice(null);
    return;
  }

  if (markdownEntries.length > 1) {
    args.setOverflowMenuOpen?.(false);
    args.setActionError(
      translateAppError("Zip archive must contain exactly one Markdown file", args.t, args.locale),
    );
    args.setActionNotice(null);
    return;
  }

  const markdownEntry = markdownEntries[0];

  const markdown = await markdownEntry.async("text");
  const markdownValidation = validateSupportedMarkdown(markdown);

  if (!markdownValidation.ok) {
    args.setOverflowMenuOpen?.(false);
    args.setActionError(translateAppError(markdownValidation.error, args.t, args.locale));
    args.setActionNotice(null);
    return;
  }

  const markdownDirectory = normalizeZipPath(markdownEntry.name.split("/").slice(0, -1).join("/"));
  const assetValidation = validateZipMarkdownAssets(zip, markdown, markdownDirectory);

  if (!assetValidation.ok) {
    args.setOverflowMenuOpen?.(false);
    args.setActionError(translateAppError(assetValidation.error, args.t, args.locale));
    args.setActionNotice(null);
    return;
  }

  const html = await markdownToEditorHtmlWithAssets(markdown, async (source) => {
    if (/^(data:|https?:\/\/)/i.test(source)) {
      return source;
    }

    const assetPath = normalizeZipPath(
      markdownDirectory ? `${markdownDirectory}/${source}` : source,
    );
    const assetEntry = zip.file(assetPath);

    if (!assetEntry) {
      return null;
    }

    const bytes = await assetEntry.async("uint8array");
    const mimeType = inferMimeTypeFromPath(assetPath);
    const upload = await uploadImageBlob(
      new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], {
        type: mimeType,
      }),
      assetPath.split("/").pop() ?? "image",
    );

    if (!upload.ok) {
      return null;
    }

    return upload.src;
  });

  await insertMarkdownIntoEditor(args, html, args.t("importMdZip"));
}

async function insertMarkdownIntoEditor(
  args: EditorActionBaseArgs & MarkdownActionI18nArgs,
  html: string,
  notice: string,
) {
  if (!args.editor) {
    args.setActionError(translateAppError("Editor is not ready", args.t, args.locale));
    args.setActionNotice(null);
    return;
  }

  args.editor.chain().focus().insertContent(html).run();
  const result = await args.saveDocument(args.document.id, { content: args.editor.getHTML() });

  if (!result.ok) {
    args.setOverflowMenuOpen?.(false);
    args.setActionError(translateAppError(result.error, args.t, args.locale));
    args.setActionNotice(null);
    return;
  }

  args.setOverflowMenuOpen?.(false);
  args.setActionError(null);
  args.setActionNotice(notice);
}

function getMarkdownEntries(zip: JSZip) {
  return Object.values(zip.files).filter(
    (entry) => !entry.dir && entry.name.toLowerCase().endsWith(".md"),
  );
}

function containsEmbeddedImages(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  return Array.from(doc.body.querySelectorAll("img")).some((image) =>
    isLocalMediaSource(image.getAttribute("src") ?? ""),
  );
}

function validateZipMarkdownAssets(zip: JSZip, markdown: string, markdownDirectory: string) {
  const missingAssets = new Set<string>();
  const invalidAssets = new Set<string>();
  const invalidFiles = new Set<string>();
  const referencedAssets = new Set<string>();
  const extraFiles = new Set<string>();

  for (const match of markdown.matchAll(/!\[(.*?)\]\((.+?)\)/g)) {
    const source = match[2] ?? "";

    if (!source || /^(data:|https?:\/\/)/i.test(source)) {
      continue;
    }

    const assetPath = normalizeZipPath(
      markdownDirectory ? `${markdownDirectory}/${source}` : source,
    );
    referencedAssets.add(assetPath);
    const assetEntry = zip.file(assetPath);

    if (!assetEntry) {
      missingAssets.add(source);
      continue;
    }

    if (!isSupportedImageMimeType(inferMimeTypeFromPath(assetPath))) {
      invalidAssets.add(source);
    }
  }

  if (missingAssets.size > 0) {
    return {
      error: `Zip archive is missing image assets: ${Array.from(missingAssets).slice(0, 3).join(", ")}`,
      ok: false as const,
    };
  }

  if (invalidAssets.size > 0) {
    return {
      error: `Zip archive contains unsupported image assets: ${Array.from(invalidAssets).slice(0, 3).join(", ")}`,
      ok: false as const,
    };
  }

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) {
      continue;
    }

    const normalizedPath = normalizeZipPath(entry.name);

    if (entry.name.toLowerCase().endsWith(".md")) {
      continue;
    }

    if (!isSupportedImageMimeType(inferMimeTypeFromPath(normalizedPath))) {
      invalidFiles.add(normalizedPath);
      continue;
    }

    if (!referencedAssets.has(normalizedPath)) {
      extraFiles.add(normalizedPath);
    }
  }

  if (invalidFiles.size > 0) {
    return {
      error: `Zip archive may only contain one Markdown file and referenced image assets: ${Array.from(invalidFiles).slice(0, 3).join(", ")}`,
      ok: false as const,
    };
  }

  if (extraFiles.size > 0) {
    return {
      error: `Zip archive contains unreferenced files: ${Array.from(extraFiles).slice(0, 3).join(", ")}`,
      ok: false as const,
    };
  }

  return {
    ok: true as const,
  };
}
