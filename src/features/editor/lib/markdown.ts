"use client";

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeMarkdown(input: string) {
  return input.replaceAll("\\", "\\\\").replaceAll("*", "\\*").replaceAll("_", "\\_");
}

function inlineMarkdownToHtml(text: string) {
  let result = escapeHtml(text);

  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  result = result.replace(/_(.+?)_/g, "<em>$1</em>");
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");

  return result;
}

function htmlInlineToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeMarkdown(node.textContent ?? "");
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const content = Array.from(node.childNodes).map(htmlInlineToMarkdown).join("");

  switch (node.tagName) {
    case "STRONG":
    case "B":
      return `**${content}**`;
    case "EM":
    case "I":
      return `*${content}*`;
    case "CODE":
      return `\`${node.textContent ?? ""}\``;
    case "BR":
      return "  \n";
    default:
      return content;
  }
}

function htmlBlockToMarkdown(node: Element): string[] {
  const tag = node.tagName;

  if (tag === "P") {
    return [Array.from(node.childNodes).map(htmlInlineToMarkdown).join("")];
  }

  if (tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4") {
    const level = Number.parseInt(tag[1] ?? "1", 10);
    return [`${"#".repeat(level)} ${Array.from(node.childNodes).map(htmlInlineToMarkdown).join("")}`];
  }

  if (tag === "BLOCKQUOTE") {
    const text = Array.from(node.childNodes)
      .map((child) =>
        child instanceof HTMLElement && child.tagName === "P"
          ? Array.from(child.childNodes).map(htmlInlineToMarkdown).join("")
          : htmlInlineToMarkdown(child),
      )
      .join("\n");

    return text.split("\n").map((line) => `> ${line}`.trimEnd());
  }

  if (tag === "UL") {
    return Array.from(node.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child.tagName === "LI")
      .map((item) => `- ${Array.from(item.childNodes).map(htmlInlineToMarkdown).join("")}`);
  }

  if (tag === "OL") {
    return Array.from(node.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child.tagName === "LI")
      .map(
        (item, index) => `${index + 1}. ${Array.from(item.childNodes).map(htmlInlineToMarkdown).join("")}`,
      );
  }

  if (tag === "PRE") {
    const codeNode = node.querySelector("code");
    const code = codeNode?.textContent ?? node.textContent ?? "";
    const languageClass = Array.from(codeNode?.classList ?? []).find((className) =>
      className.startsWith("language-"),
    );
    const language = languageClass?.replace("language-", "") ?? "";

    return [`\`\`\`${language}`, code.replace(/\n$/, ""), "```"];
  }

  if (tag === "HR") {
    return ["---"];
  }

  if (tag === "IMG") {
    const alt = node.getAttribute("alt") ?? "";
    const src = node.getAttribute("src") ?? "";

    if (!src) {
      return [];
    }

    return [`![${alt}](${src})`];
  }

  return [Array.from(node.childNodes).map(htmlInlineToMarkdown).join("")];
}

export function editorHtmlToMarkdown(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks = Array.from(doc.body.children)
    .flatMap((node) => htmlBlockToMarkdown(node))
    .map((line) => line.trimEnd());

  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function markdownToEditorHtml(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return "<p></p>";
  }

  const lines = normalized.split("\n");
  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^```[\w+-]*$/.test(trimmed)) {
      const openingLine = trimmed;
      const languageMatch = openingLine.match(/^```([\w+-]+)?$/);
      const language = languageMatch?.[1]?.trim() ?? "";
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && (lines[index] ?? "").trim() !== "```") {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }

      const languageClass = language ? ` class="language-${escapeHtml(language)}"` : "";
      blocks.push(`<pre><code${languageClass}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      index += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push("<hr>");
      index += 1;
      continue;
    }

    const imageMatch = trimmed.match(/^!\[(.*?)\]\((.+?)\)$/);

    if (imageMatch) {
      blocks.push(
        `<img alt="${escapeHtml(imageMatch[1] ?? "")}" src="${escapeHtml(imageMatch[2] ?? "")}">`,
      );
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);

    if (headingMatch) {
      const level = headingMatch[1]?.length ?? 1;
      blocks.push(`<h${level}>${inlineMarkdownToHtml(headingMatch[2] ?? "")}</h${level}>`);
      index += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = [];

      while (index < lines.length && (lines[index] ?? "").trim().startsWith("> ")) {
        quoteLines.push((lines[index] ?? "").trim().slice(2));
        index += 1;
      }

      blocks.push(
        `<blockquote>${quoteLines
          .map((quoteLine) => `<p>${inlineMarkdownToHtml(quoteLine)}</p>`)
          .join("")}</blockquote>`,
      );
      continue;
    }

    if (/^- /.test(trimmed)) {
      const items: string[] = [];

      while (index < lines.length && /^- /.test((lines[index] ?? "").trim())) {
        items.push(`<li>${inlineMarkdownToHtml((lines[index] ?? "").trim().slice(2))}</li>`);
        index += 1;
      }

      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];

      while (index < lines.length && /^\d+\.\s+/.test((lines[index] ?? "").trim())) {
        items.push(
          `<li>${inlineMarkdownToHtml((lines[index] ?? "").trim().replace(/^\d+\.\s+/, ""))}</li>`,
        );
        index += 1;
      }

      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length && (lines[index] ?? "").trim()) {
      paragraphLines.push(lines[index] ?? "");
      index += 1;
    }

    blocks.push(`<p>${inlineMarkdownToHtml(paragraphLines.join(" "))}</p>`);
  }

  return blocks.join("");
}

export function sanitizeMarkdownFilename(title: string) {
  const base = title.trim() || "Untitled";

  return `${base.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").replace(/\s+/g, "-") || "Untitled"}.md`;
}
