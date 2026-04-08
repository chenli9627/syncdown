import {
  editorHtmlToMarkdownBundle,
  getMarkdownImportLimit,
  inferMimeTypeFromPath,
  markdownToEditorHtml,
  markdownToEditorHtmlWithAssets,
  normalizeZipPath,
  sanitizeZipFilename,
} from "@/features/editor/lib/markdown";
import type { EditorActionBaseArgs } from "@/features/editor/lib/editor-action-types";
import JSZip from "jszip";

export function exportEditorMarkdown({ document, editor, setActionError, setActionNotice }: Pick<
  EditorActionBaseArgs,
  "document" | "editor" | "setActionError" | "setActionNotice"
>) {
  return exportEditorMarkdownZip({
    document,
    editor,
    setActionError,
    setActionNotice,
  });
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

async function exportEditorMarkdownZip({
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
  const markdownEntry = pickMarkdownEntry(zip);

  if (!markdownEntry) {
    args.setActionError("Zip archive does not contain a Markdown file");
    args.setActionNotice(null);
    return;
  }

  const markdown = await markdownEntry.async("text");
  const markdownDirectory = normalizeZipPath(markdownEntry.name.split("/").slice(0, -1).join("/"));
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

function pickMarkdownEntry(zip: JSZip) {
  const entries = Object.values(zip.files).filter((entry) => !entry.dir && entry.name.toLowerCase().endsWith(".md"));
  const pageEntry = entries.find((entry) => normalizeZipPath(entry.name) === "page.md");

  return pageEntry ?? entries[0] ?? null;
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
