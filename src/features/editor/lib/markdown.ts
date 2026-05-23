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
    error: "Markdown links are not supported yet",
    pattern: /(^|[^\!])\[[^\]]+\]\([^)]+\)/m,
  },
  {
    error: "Strikethrough markdown is not supported yet",
    pattern: /~~[^~]+~~/,
  },
  {
    error: "Nested markdown lists are not supported yet",
    pattern: /^\s{2,}(?:- |\d+\.\s)/m,
  },
  {
    error: "Raw HTML blocks are not supported in markdown import",
    pattern: /<(?!img\b)[a-z][^>]*>/i,
  },
  {
    error: "Footnotes are not supported yet",
    pattern: /\[\^[^\]]+\]/,
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

function htmlBlockToMarkdown(node: Element, headings: MarkdownHeading[] = []): string[] {
  const tag = node.tagName;

  if (node.getAttribute("data-type") === "table-of-contents") {
    return tableOfContentsBlockToMarkdown(headings);
  }

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
      const headerCells = splitMarkdownTableRow(lines[index] ?? "");
      const bodyRows: string[][] = [];
      index += 2;

      while (index < lines.length && isMarkdownTableRow(lines[index] ?? "")) {
        bodyRows.push(splitMarkdownTableRow(lines[index] ?? ""));
        index += 1;
      }

      blocks.push(markdownTableToHtml(headerCells, bodyRows));
      continue;
    }

    if (/^- /.test(trimmed)) {
      const taskItems: string[] = [];
      let taskIndex = index;

      while (taskIndex < lines.length && /^- \[(?: |x|X)\]\s+/.test((lines[taskIndex] ?? "").trim())) {
        const taskLine = (lines[taskIndex] ?? "").trim();
        const checked = /^- \[(?:x|X)\]/.test(taskLine);
        const content = taskLine.replace(/^- \[(?: |x|X)\]\s+/, "");
        taskItems.push(
          `<li data-checked="${checked ? "true" : "false"}" data-type="taskItem"><label><input ${
            checked ? "checked" : ""
          } type="checkbox"><span></span></label><div><p>${inlineMarkdownToHtml(content)}</p></div></li>`,
        );
        taskIndex += 1;
      }

      if (taskItems.length > 0) {
        blocks.push(`<ul data-type="taskList">${taskItems.join("")}</ul>`);
        index = taskIndex;
        continue;
      }

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
  return (
    isMarkdownTableRow(lines[index] ?? "") &&
    isMarkdownTableSeparator(lines[index + 1] ?? "")
  );
}

function isMarkdownTableRow(line: string) {
  const trimmed = line.trim();
  return /^\|?.+\|.+\|?$/.test(trimmed);
}

function isMarkdownTableSeparator(line: string) {
  const trimmed = line.trim();
  return /^\|?\s*:?-{3,}:?(?:\s*\|\s*:?-{3,}:?)+\s*\|?$/.test(trimmed);
}

function splitMarkdownTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
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
