import type { Editor } from "@tiptap/react";

export function insertContentWithFallback(
  editor: Editor,
  position: number | { from: number; to: number },
  content: string,
) {
  const before = JSON.stringify(editor.state.doc.toJSON());

  editor.chain().focus().insertContentAt(position, content).run();

  if (JSON.stringify(editor.state.doc.toJSON()) !== before) {
    return;
  }

  const fallbackContent = toPlainParagraphHtml(content);

  if (fallbackContent && fallbackContent !== content) {
    editor.chain().focus().insertContentAt(position, fallbackContent).run();
  }
}

function toPlainParagraphHtml(content: string) {
  const texts = extractBlockTexts(content);

  return texts.map((text) => `<p>${escapeHtml(text)}</p>`).join("");
}

function extractBlockTexts(content: string) {
  if (typeof DOMParser !== "undefined") {
    const document = new DOMParser().parseFromString(`<main>${content}</main>`, "text/html");
    const blockTexts = Array.from(
      document.body.querySelectorAll("p,h1,h2,h3,h4,h5,h6,blockquote,li,pre,tr"),
    )
      .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .filter(Boolean);

    if (blockTexts.length) {
      return blockTexts;
    }

    const documentText = document.body.textContent?.replace(/\s+/g, " ").trim();
    return documentText ? [documentText] : [];
  }

  return content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|h[1-6]|blockquote|li|pre|tr)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .split(/\n{2,}/)
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
