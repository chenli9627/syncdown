"use client";

export type MarkdownAsset = {
  data: Uint8Array;
  mimeType: string;
  path: string;
};

type MarkdownHeading = {
  level: number;
  text: string;
};

const UNSUPPORTED_MARKDOWN_PATTERNS: Array<{
  error: string;
  pattern: RegExp;
}> = [
  {
    error: "Raw HTML blocks are not supported in markdown import",
    pattern: /<(?!img\b|https?:\/\/|mailto:)(?:\/)?[a-z][^>]*>/i,
  },
];

const DATA_IMAGE_URL_PATTERN = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/;
const LOCAL_MEDIA_URL_PATTERN = /(?:https?:\/\/[^/]+)?\/api\/media\/([^/?#]+)$/i;
const MARKDOWN_IMAGE_PATTERN = /!\[(.*?)\]\((.+?)\)/g;

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
  const links: string[] = [];

  result = result.replace(/\[\^([^\]]+)\]/g, (_match, id: string) => {
    const label = `[^${id}]`;
    return stashLink(links, label, `#footnote-${id}`) ?? label;
  });
  result = result.replace(
    /&lt;((?:https?:\/\/|mailto:)[^&\s<>]+)&gt;/gi,
    (match, href: string) => stashLink(links, href, href) ?? match,
  );
  result = result.replace(/(?<!!)\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) =>
    stashLink(links, label, href) ?? match,
  );
  result = result.replace(/(^|[\s(])((?:https?:\/\/|mailto:)[^\s<]+)/gi, (match, prefix: string, href: string) => {
    const { cleanHref, trailing } = splitTrailingUrlPunctuation(href);
    const link = stashLink(links, cleanHref, cleanHref);
    return link ? `${prefix}${link}${trailing}` : match;
  });

  result = result.replace(/~~(.+?)~~/g, "<s>$1</s>");
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  result = result.replace(/_(.+?)_/g, "<em>$1</em>");
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");

  return restoreLinks(result, links);
}

function stashLink(links: string[], escapedLabel: string, escapedHref: string) {
  const href = normalizeMarkdownLinkHref(escapedHref);

  if (!href || !isSafeMarkdownLinkHref(href)) {
    return null;
  }

  const index = links.length;
  links.push(`<a href="${href}">${escapedLabel}</a>`);
  return `\uE000LINK${index}\uE000`;
}

function restoreLinks(input: string, links: string[]) {
  return input.replace(/\uE000LINK(\d+)\uE000/g, (_match, index: string) => links[Number(index)] ?? "");
}

function isSafeMarkdownLinkHref(href: string) {
  return /^(?:https?:\/\/|mailto:|\/|#)/i.test(href);
}

function normalizeMarkdownLinkHref(href: string) {
  if (/^(?:https?:\/\/|mailto:|\/|#)/i.test(href)) {
    return href;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[/?#][^\s]*)?$/i.test(href)) {
    return `https://${href}`;
  }

  return null;
}

function splitTrailingUrlPunctuation(href: string) {
  const match = href.match(/^(.+?)([.,;:!?)]*)$/);
  return {
    cleanHref: match?.[1] ?? href,
    trailing: match?.[2] ?? "",
  };
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
    case "S":
    case "DEL":
    case "STRIKE":
      return `~~${content}~~`;
    case "A": {
      const href = node.getAttribute("href") ?? "";
      if (/^#footnote-/.test(href) && /^\[\^[^\]]+\]$/.test(content)) {
        return content;
      }
      return href ? `[${content}](${href})` : content;
    }
    case "CODE":
      return `\`${node.textContent ?? ""}\``;
    case "BR":
      return "  \n";
    default:
      return content;
  }
}

function htmlBlockToMarkdown(node: Element, headings: MarkdownHeading[] = []): string[] {
  const tag = node.tagName;

  if (node.getAttribute("data-type") === "table-of-contents") {
    return tableOfContentsBlockToMarkdown(headings);
  }

  if (tag === "P") {
    return [Array.from(node.childNodes).map(htmlInlineToMarkdown).join("")];
  }

  if (tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4" || tag === "H5" || tag === "H6") {
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

  if (tag === "TABLE") {
    return tableBlockToMarkdown(node);
  }

  if (tag === "UL") {
    if (node.getAttribute("data-type") === "taskList") {
      return Array.from(node.children)
        .filter(
          (child): child is HTMLElement =>
            child instanceof HTMLElement && child.tagName === "LI",
        )
        .map((item) => {
          const checked = item.getAttribute("data-checked") === "true";
          const content =
            item.querySelector("div") ??
            item.querySelector("p") ??
            item;

          return `- [${checked ? "x" : " "}] ${Array.from(content.childNodes)
            .map(htmlInlineToMarkdown)
            .join("")}`.trimEnd();
        });
    }

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
  const headings = collectMarkdownHeadings(doc.body.children);
  const blocks = Array.from(doc.body.children)
    .flatMap((node) => htmlBlockToMarkdown(node, headings))
    .map((line) => line.trimEnd());

  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function editorHtmlToMarkdownBundle(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const assetCounters = new Map<string, number>();
  const assets: MarkdownAsset[] = [];

  async function materializeImageAsset(src: string) {
    if (!src) {
      return null;
    }

    const dataMatch = src.match(DATA_IMAGE_URL_PATTERN);

    if (dataMatch) {
      const mimeType = dataMatch[1] ?? "image/png";
      const extension = extensionFromMimeType(mimeType);
      const path = nextAssetPath(extension, assetCounters);
      assets.push({
        data: base64ToUint8Array(dataMatch[2] ?? ""),
        mimeType,
        path,
      });

      return path;
    }

    const localMediaMatch = src.match(LOCAL_MEDIA_URL_PATTERN);

    if (localMediaMatch) {
      try {
        const response = await fetch(new URL(src, globalThis.location?.href).toString());

        if (!response.ok) {
          return src;
        }

        const blob = await response.blob();
        const mimeType = blob.type || "image/png";
        const extension = extensionFromMimeType(mimeType);
        const path = nextAssetPath(extension, assetCounters);
        assets.push({
          data: new Uint8Array(await blob.arrayBuffer()),
          mimeType,
          path,
        });

        return path;
      } catch {
        return src;
      }
    }

    if (/^https?:\/\//i.test(src)) {
      try {
        const response = await fetch(src);

        if (!response.ok) {
          return src;
        }

        const blob = await response.blob();
        const mimeType = blob.type || "image/png";
        const extension = extensionFromMimeType(mimeType);
        const path = nextAssetPath(extension, assetCounters);
        assets.push({
          data: new Uint8Array(await blob.arrayBuffer()),
          mimeType,
          path,
        });

        return path;
      } catch {
        return src;
      }
    }

    return src;
  }

  for (const image of Array.from(doc.body.querySelectorAll("img"))) {
    const src = image.getAttribute("src") ?? "";
    const nextPath = await materializeImageAsset(src);

    if (nextPath) {
      image.setAttribute("src", nextPath);
    }
  }

  return {
    assets,
    markdown: editorHtmlToMarkdown(doc.body.innerHTML),
  };
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

    const fenceMatch = trimmed.match(/^(`{2,3})([\w+-]+)?$/);

    if (fenceMatch) {
      const openingFence = fenceMatch[1] ?? "```";
      const language = fenceMatch[2]?.trim() ?? "";
      const closingFence = openingFence;
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && (lines[index] ?? "").trim() !== closingFence) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }

      const languageClass = language ? ` class="language-${escapeHtml(language)}"` : "";
      blocks.push(`<pre><code${languageClass}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      index += 1;
      continue;
    }

    if (/^(?:---+|\*\*\*+)$/.test(trimmed)) {
      blocks.push("<hr>");
      index += 1;
      continue;
    }

    if (/^\[TOC\]$/i.test(trimmed)) {
      blocks.push('<div data-type="table-of-contents"></div>');
      index += 1;
      continue;
    }

    const footnoteMatch = trimmed.match(/^\[\^([^\]]+)\]:\s*(.*)$/);

    if (footnoteMatch) {
      const footnoteId = footnoteMatch[1] ?? "";
      const footnoteLines = [footnoteMatch[2] ?? ""];
      index += 1;

      while (index < lines.length) {
        const continuationLine = lines[index] ?? "";

        if (!continuationLine.trim()) {
          index += 1;
          continue;
        }

        if (/^(?: {2,}|\t)/.test(continuationLine)) {
          footnoteLines.push(continuationLine.trim());
          index += 1;
          continue;
        }

        break;
      }

      blocks.push(
        `<p>${inlineMarkdownToHtml(`[^${footnoteId}]`)}: ${inlineMarkdownToHtml(footnoteLines.join(" "))}</p>`,
      );
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

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);

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

    if (isMarkdownTableStart(lines, index)) {
      const headerIndex = index;
      const separatorIndex = nextNonEmptyLineIndex(lines, index + 1);
      const headerCells = splitMarkdownTableRow(lines[headerIndex] ?? "");
      const bodyRows: string[][] = [];
      index = separatorIndex + 1;

      while (index < lines.length) {
        if (!(lines[index] ?? "").trim()) {
          index += 1;
          continue;
        }

        if (!isMarkdownTableRow(lines[index] ?? "")) {
          break;
        }

        bodyRows.push(splitMarkdownTableRow(lines[index] ?? ""));
        index += 1;
      }

      blocks.push(markdownTableToHtml(headerCells, bodyRows));
      continue;
    }

    if (isMarkdownListLine(line)) {
      const parsedList = parseMarkdownList(lines, index);
      blocks.push(parsedList.html);
      index = parsedList.nextIndex;
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

export function validateSupportedMarkdown(markdown: string) {
  for (const rule of UNSUPPORTED_MARKDOWN_PATTERNS) {
    if (rule.pattern.test(markdown)) {
      return {
        ok: false as const,
        error: rule.error,
      };
    }
  }

  return {
    ok: true as const,
  };
}

export function validateStandaloneMarkdownAssets(markdown: string) {
  const localImageSources = new Set<string>();

  for (const match of markdown.matchAll(MARKDOWN_IMAGE_PATTERN)) {
    const source = (match[2] ?? "").trim();

    if (!source || /^(data:|https?:\/\/)/i.test(source)) {
      continue;
    }

    localImageSources.add(source);
  }

  if (localImageSources.size > 0) {
    return {
      error: `Markdown file contains local image references and must be imported as .zip: ${Array.from(localImageSources).slice(0, 3).join(", ")}`,
      ok: false as const,
    };
  }

  return {
    ok: true as const,
  };
}

export async function markdownToEditorHtmlWithAssets(
  markdown: string,
  resolveImageSource: (src: string) => Promise<string | null>,
) {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return "<p></p>";
  }

  const imageMatches = Array.from(normalized.matchAll(MARKDOWN_IMAGE_PATTERN));
  const replacements = new Map<string, string>();

  for (const match of imageMatches) {
    const originalSource = match[2] ?? "";

    if (!originalSource || replacements.has(originalSource)) {
      continue;
    }

    const resolvedSource = await resolveImageSource(originalSource);

    if (resolvedSource) {
      replacements.set(originalSource, resolvedSource);
    }
  }

  let nextMarkdown = normalized;

  for (const [originalSource, resolvedSource] of replacements.entries()) {
    nextMarkdown = nextMarkdown.replaceAll(`](${originalSource})`, `](${resolvedSource})`);
  }

  return markdownToEditorHtml(nextMarkdown);
}

export function sanitizeMarkdownFilename(title: string) {
  const base = title.trim() || "Untitled";

  return `${base.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").replace(/\s+/g, "-") || "Untitled"}.md`;
}

export function sanitizeZipFilename(title: string) {
  const base = title.trim() || "Untitled";

  return `${base.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").replace(/\s+/g, "-") || "Untitled"}.zip`;
}

export function isLocalMediaSource(src: string) {
  return LOCAL_MEDIA_URL_PATTERN.test(src) || DATA_IMAGE_URL_PATTERN.test(src);
}

export function getMarkdownImportLimit(fileName: string) {
  return fileName.toLowerCase().endsWith(".zip")
    ? 20 * 1024 * 1024
    : 5 * 1024 * 1024;
}

export function inferMimeTypeFromPath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();

  switch (extension) {
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

export function normalizeZipPath(path: string) {
  const segments = path.split("/").filter(Boolean);
  const normalized: string[] = [];

  for (const segment of segments) {
    if (segment === ".") {
      continue;
    }

    if (segment === "..") {
      normalized.pop();
      continue;
    }

    normalized.push(segment);
  }

  return normalized.join("/");
}

function nextAssetPath(extension: string, counters: Map<string, number>) {
  const currentCount = counters.get(extension) ?? 0;
  const nextCount = currentCount + 1;
  counters.set(extension, nextCount);
  return `assets/image-${nextCount}.${extension}`;
}

function extensionFromMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "png";
  }
}

function base64ToUint8Array(base64: string) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function tableBlockToMarkdown(node: Element) {
  const rows = Array.from(node.querySelectorAll("tr")).map((row) =>
    Array.from(row.querySelectorAll("th, td")).map((cell) =>
      Array.from(cell.childNodes).map(htmlInlineToMarkdown).join("").trim(),
    ),
  );

  if (!rows.length) {
    return [];
  }

  const header = rows[0] ?? [];
  const body = rows.slice(1);
  const normalizedHeader = header.length ? header : [""];
  const separator = normalizedHeader.map(() => "---");
  const lines = [
    `| ${normalizedHeader.join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
  ];

  for (const row of body) {
    const padded = [...row];

    while (padded.length < normalizedHeader.length) {
      padded.push("");
    }

    lines.push(`| ${padded.join(" | ")} |`);
  }

  return lines;
}

function isMarkdownTableStart(lines: string[], index: number) {
  const separatorIndex = nextNonEmptyLineIndex(lines, index + 1);

  return (
    isMarkdownTableRow(lines[index] ?? "") &&
    separatorIndex < lines.length &&
    isMarkdownTableSeparator(lines[separatorIndex] ?? "")
  );
}

function isMarkdownTableRow(line: string) {
  const trimmed = line.trim();
  return /^\|?.+\|.+\|?$/.test(trimmed);
}

function isMarkdownTableSeparator(line: string) {
  const trimmed = line.trim();
  return /^\|?\s*:?-+:?(?:\s*\|\s*:?-+:?)+\s*\|?$/.test(trimmed);
}

function splitMarkdownTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

type MarkdownListType = "bullet" | "ordered" | "task";

type MarkdownListLine = {
  content: string;
  indent: number;
  listType: MarkdownListType;
  rawLine: string;
  checked?: boolean;
};

function isMarkdownListLine(line: string) {
  return parseMarkdownListLine(line) !== null;
}

function parseMarkdownList(lines: string[], startIndex: number, parentIndent = -1) {
  let index = startIndex;
  let listType: MarkdownListType | null = null;
  const items: string[] = [];

  while (index < lines.length) {
    const currentLine = lines[index] ?? "";
    const trimmed = currentLine.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const listLine = parseMarkdownListLine(currentLine);

    if (!listLine) {
      break;
    }

    if (listLine.indent <= parentIndent) {
      break;
    }

    if (listType === null) {
      listType = listLine.listType;
    } else if (listLine.indent === parentIndent + 1 && listLine.listType !== listType) {
      break;
    }

    if (listLine.indent > parentIndent + 1 && items.length > 0) {
      const nested = parseMarkdownList(lines, index, listLine.indent - 1);
      const lastItem = items.pop();

      if (lastItem) {
        items.push(lastItem.replace(/<\/li>$/, `${nested.html}</li>`));
      }

      index = nested.nextIndex;
      continue;
    }

    const itemHtml = renderMarkdownListItem(listLine);
    items.push(itemHtml);
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index] ?? "";
      const nextTrimmed = nextLine.trim();

      if (!nextTrimmed) {
        index += 1;
        continue;
      }

      const nestedListLine = parseMarkdownListLine(nextLine);

      if (!nestedListLine || nestedListLine.indent <= listLine.indent) {
        break;
      }

      const nested = parseMarkdownList(lines, index, listLine.indent);
      const lastItem = items.pop();

      if (lastItem) {
        items.push(lastItem.replace(/<\/li>$/, `${nested.html}</li>`));
      }

      index = nested.nextIndex;
    }
  }

  const html = wrapMarkdownListHtml(listType ?? "bullet", items);
  return {
    html,
    nextIndex: index,
  };
}

function parseMarkdownListLine(line: string): MarkdownListLine | null {
  const match = line.match(/^(\s*)(- \[(?: |x|X)\]\s+|- |\d+\.\s+)(.*)$/);

  if (!match) {
    return null;
  }

  const indent = normalizeMarkdownListIndent(match[1] ?? "");
  const marker = match[2] ?? "";
  const content = match[3] ?? "";

  if (/^- \[(?: |x|X)\]\s+/.test(marker)) {
    return {
      checked: /^- \[(?:x|X)\]\s+/.test(marker),
      content,
      indent,
      listType: "task",
      rawLine: line,
    };
  }

  if (/^\d+\.\s+/.test(marker)) {
    return {
      content,
      indent,
      listType: "ordered",
      rawLine: line,
    };
  }

  return {
    content,
    indent,
    listType: "bullet",
    rawLine: line,
  };
}

function normalizeMarkdownListIndent(indent: string) {
  const spaces = indent.replace(/\t/g, "  ").length;
  return Math.floor(spaces / 2);
}

function renderMarkdownListItem(item: MarkdownListLine) {
  const content = inlineMarkdownToHtml(item.content.trim());

  if (item.listType === "task") {
    return `<li data-checked="${item.checked ? "true" : "false"}" data-type="taskItem"><label><input ${
      item.checked ? "checked" : ""
    } type="checkbox"><span></span></label><div><p>${content}</p></div></li>`;
  }

  return `<li>${content}</li>`;
}

function wrapMarkdownListHtml(listType: MarkdownListType, items: string[]) {
  if (listType === "ordered") {
    return `<ol>${items.join("")}</ol>`;
  }

  if (listType === "task") {
    return `<ul data-type="taskList">${items.join("")}</ul>`;
  }

  return `<ul>${items.join("")}</ul>`;
}

function nextNonEmptyLineIndex(lines: string[], index: number) {
  let currentIndex = index;

  while (currentIndex < lines.length && !(lines[currentIndex] ?? "").trim()) {
    currentIndex += 1;
  }

  return currentIndex;
}

function markdownTableToHtml(headerCells: string[], bodyRows: string[][]) {
  const header = `<thead><tr>${headerCells
    .map((cell) => `<th>${inlineMarkdownToHtml(cell)}</th>`)
    .join("")}</tr></thead>`;
  const body = `<tbody>${bodyRows
    .map((row) => {
      const padded = [...row];

      while (padded.length < headerCells.length) {
        padded.push("");
      }

      return `<tr>${padded
        .slice(0, headerCells.length)
        .map((cell) => `<td>${inlineMarkdownToHtml(cell)}</td>`)
        .join("")}</tr>`;
    })
    .join("")}</tbody>`;

  return `<table>${header}${body}</table>`;
}

function collectMarkdownHeadings(nodes: HTMLCollection) {
  return Array.from(nodes).flatMap((node): MarkdownHeading[] => {
    if (!["H1", "H2", "H3", "H4"].includes(node.tagName)) {
      return [];
    }

    const text = (node.textContent ?? "").trim();

    if (!text) {
      return [];
    }

    return [
      {
        level: Number.parseInt(node.tagName[1] ?? "1", 10),
        text,
      },
    ];
  });
}

function tableOfContentsBlockToMarkdown(headings: MarkdownHeading[]) {
  if (!headings.length) {
    return ["## Table of Contents"];
  }

  return [
    "## Table of Contents",
    "",
    ...headings.map((heading) => {
      const indent = "  ".repeat(Math.max(0, heading.level - 1));
      return `${indent}- ${escapeMarkdown(heading.text)}`;
    }),
  ];
}
