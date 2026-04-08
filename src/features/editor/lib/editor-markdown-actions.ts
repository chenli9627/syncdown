import {
  editorHtmlToMarkdown,
  markdownToEditorHtml,
  sanitizeMarkdownFilename,
} from "@/features/editor/lib/markdown";
import type { EditorActionBaseArgs } from "@/features/editor/lib/editor-action-types";

export function exportEditorMarkdown({ document, editor, setActionError, setActionNotice }: Pick<
  EditorActionBaseArgs,
  "document" | "editor" | "setActionError" | "setActionNotice"
>) {
  const html = editor?.getHTML() ?? document.content;
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
  if (!file.name.toLowerCase().endsWith(".md")) {
    args.setActionError("Only .md files are supported right now");
    args.setActionNotice(null);
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    args.setActionError("上传文件过大");
    args.setActionNotice(null);
    return;
  }

  const markdown = await file.text();
  const html = markdownToEditorHtml(markdown);
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
  args.setActionNotice("Markdown imported");
}
