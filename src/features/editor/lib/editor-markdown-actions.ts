import {
  editorHtmlToMarkdown,
  editorHtmlToMarkdownBundle,
  getMarkdownImportLimit,
  inferMimeTypeFromPath,
  markdownToEditorHtml,
  markdownToEditorHtmlWithAssets,
  normalizeZipPath,
  sanitizeMarkdownFilename,
  sanitizeZipFilename,
} from "@/features/editor/lib/markdown";
import type { EditorActionBaseArgs } from "@/features/editor/lib/editor-action-types";
import { isSupportedImageMimeType } from "@/features/editor/lib/image";
import JSZip from "jszip";

export function exportEditorMarkdown({ document, editor, setActionError, setActionNotice }: Pick<
  EditorActionBaseArgs,
  "document" | "editor" | "setActionError" | "setActionNotice"
>) {
  const html = editor?.getHTML() ?? document.content;

  if (containsEmbeddedImages(html)) {
    return exportEditorMarkdownZipInternal({
      document,
      editor,
      setActionError,
      setActionNotice,
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
  setActionError(null);
  setActionNotice("Markdown exported");
}

export async function importEditorMarkdown(args: EditorActionBaseArgs, file: File) {
  if (!args.canEditBody) {
    args.setActionError("You do not have permission to import");
    args.setActionNotice(null);
    return;
  }
  const lowerName = file.name.toLowerCase();

  if (!lowerName.endsWith(".md") && !lowerName.endsWith(".zip")) {
    args.setActionError("Only .md and .zip files are supported");
    args.setActionNotice(null);
    return;
  }

  if (file.size > getMarkdownImportLimit(file.name)) {
    args.setActionError("上传文件过大");
    args.setActionNotice(null);
    return;
  }

  if (lowerName.endsWith(".zip")) {
    await importMarkdownZip(args, file);
    return;
  }

  const markdown = await file.text();
  await insertMarkdownIntoEditor(args, markdownToEditorHtml(markdown), "Markdown imported");
}

async function exportEditorMarkdownZipInternal({
  document,
  editor,
  setActionError,
  setActionNotice,
}: Pick<
  EditorActionBaseArgs,
  "document" | "editor" | "setActionError" | "setActionNotice"
>) {
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
  setActionError(null);
  setActionNotice("Markdown zip exported");
}

async function importMarkdownZip(args: EditorActionBaseArgs, file: File) {
  const zip = await JSZip.loadAsync(file);
  const markdownEntries = getMarkdownEntries(zip);

  if (markdownEntries.length === 0) {
    args.setActionError("Zip archive does not contain a Markdown file");
    args.setActionNotice(null);
    return;
  }

  if (markdownEntries.length > 1) {
    args.setActionError("Zip archive must contain exactly one Markdown file");
    args.setActionNotice(null);
    return;
  }

  const markdownEntry = markdownEntries[0];

  const markdown = await markdownEntry.async("text");
  const markdownDirectory = normalizeZipPath(markdownEntry.name.split("/").slice(0, -1).join("/"));
  const assetValidation = validateZipMarkdownAssets(zip, markdown, markdownDirectory);

  if (!assetValidation.ok) {
    args.setActionError(assetValidation.error);
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
    return uint8ArrayToDataUrl(bytes, mimeType);
  });

  await insertMarkdownIntoEditor(args, html, "Markdown zip imported");
}

async function insertMarkdownIntoEditor(
  args: EditorActionBaseArgs,
  html: string,
  notice: string,
) {
  if (!args.editor) {
    args.setActionError("Editor is not ready");
    args.setActionNotice(null);
    return;
  }

  args.editor.chain().focus().insertContent(html).run();
  const result = await args.saveDocument(args.document.id, { content: args.editor.getHTML() });

  if (!result.ok) {
    args.setActionError(result.error);
    args.setActionNotice(null);
    return;
  }

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
    (image.getAttribute("src") ?? "").startsWith("data:"),
  );
}

function validateZipMarkdownAssets(zip: JSZip, markdown: string, markdownDirectory: string) {
  const missingAssets = new Set<string>();
  const invalidAssets = new Set<string>();
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

    if (entry.name.toLowerCase().endsWith(".md")) {
      continue;
    }

    const normalizedPath = normalizeZipPath(entry.name);

    if (!referencedAssets.has(normalizedPath)) {
      extraFiles.add(normalizedPath);
    }
  }

  if (extraFiles.size > 0) {
    return {
      error: `Zip archive contains extra files: ${Array.from(extraFiles).slice(0, 3).join(", ")}`,
      ok: false as const,
    };
  }

  return {
    ok: true as const,
  };
}

async function uint8ArrayToDataUrl(bytes: Uint8Array, mimeType: string) {
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: mimeType });

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read asset"));
    };

    reader.onerror = () => {
      reject(new Error("Failed to read asset"));
    };

    reader.readAsDataURL(blob);
  });
}
