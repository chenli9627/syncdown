"use client";

import type { DocumentRecord } from "@/features/app-state/types";
import { diffVersionText } from "@/features/editor/lib/version-history";

export type DocumentUpdateLabels = {
  imageSingle: string;
  tableOfContents: string;
  title: string;
};

export type DocumentUpdatePart = {
  text: string;
  type: "added" | "removed";
};

export type DocumentUpdateEntry = {
  id: string;
  createdAt: string;
  nextContent: string;
  nextTitle: string;
  previousContent: string;
  previousTitle: string;
  userId: string;
};

export function getDocumentUpdateEntries(
  document: Pick<DocumentRecord, "updateHistory" | "versionHistory">,
): DocumentUpdateEntry[] {
  if (document.updateHistory?.length) {
    return document.updateHistory.map((update) => ({
      createdAt: update.createdAt,
      id: update.id,
      nextContent: update.nextContent,
      nextTitle: update.nextTitle,
      previousContent: update.previousContent,
      previousTitle: update.previousTitle,
      userId: update.userId,
    }));
  }

  const versions = document.versionHistory ?? [];

  return versions.map((version, index) => {
    const previousVersion = versions[index + 1] ?? null;

    return {
      createdAt: version.createdAt,
      id: version.id,
      nextContent: version.content,
      nextTitle: version.title,
      previousContent: previousVersion?.content ?? "",
      previousTitle: previousVersion?.title ?? "",
      userId: version.userId,
    };
  });
}

export function getDocumentUpdateParts(
  entry: Pick<
    DocumentUpdateEntry,
    "nextContent" | "nextTitle" | "previousContent" | "previousTitle"
  >,
  labels: DocumentUpdateLabels,
) {
  const previousText = documentStateToUpdateText(
    {
      content: entry.previousContent,
      title: entry.previousTitle,
    },
    labels,
  );
  const currentText = documentStateToUpdateText(
    {
      content: entry.nextContent,
      title: entry.nextTitle,
    },
    labels,
  );

  return getChangedParts(previousText, currentText);
}

function documentStateToUpdateText(
  document: Pick<DocumentRecord, "content" | "title">,
  labels: DocumentUpdateLabels,
) {
  return `${labels.title}: ${document.title}\n\n${htmlToUpdateText(document.content, labels)}`.trim();
}

function getChangedParts(previousText: string, currentText: string) {
  return diffVersionText(previousText, currentText).filter(
    (part): part is DocumentUpdatePart =>
      part.type !== "unchanged" && part.text.trim() !== "",
  );
}

function htmlToUpdateText(html: string, labels: DocumentUpdateLabels) {
  if (!html.trim()) {
    return "";
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks = Array.from(doc.body.children);
  const renderedBlocks =
    blocks.length > 0
      ? blocks.map((block) => serializeBlock(block, labels))
      : [serializeInline(doc.body, labels)];

  return renderedBlocks.filter(Boolean).join("\n\n");
}

function serializeBlock(element: Element, labels: DocumentUpdateLabels): string {
  const tagName = element.tagName.toLowerCase();

  if (tagName.match(/^h[1-4]$/)) {
    const level = Number(tagName.slice(1));
    return `${"#".repeat(level)} ${serializeInline(element, labels).trim()}`.trim();
  }

  if (tagName === "blockquote") {
    return serializeChildrenAsBlocks(element, labels)
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }

  if (tagName === "pre") {
    return `\`\`\`\n${element.textContent?.trim() ?? ""}\n\`\`\``;
  }

  if (tagName === "ul" || tagName === "ol") {
    return serializeList(element, labels, tagName === "ol");
  }

  if (tagName === "table") {
    return serializeTable(element, labels);
  }

  if (tagName === "hr") {
    return "---";
  }

  if (element.matches('div[data-type="table-of-contents"]')) {
    return `[${labels.tableOfContents}]`;
  }

  return serializeInline(element, labels).trim();
}

function serializeChildrenAsBlocks(element: Element, labels: DocumentUpdateLabels) {
  return Array.from(element.children)
    .map((child) => serializeBlock(child, labels))
    .filter(Boolean)
    .join("\n\n") || serializeInline(element, labels).trim();
}

function serializeList(element: Element, labels: DocumentUpdateLabels, ordered: boolean) {
  return Array.from(element.children)
    .filter((child) => child.tagName.toLowerCase() === "li")
    .map((item, index) => {
      const taskState = getTaskState(item);
      const marker = taskState ? `- [${taskState}]` : ordered ? `${index + 1}.` : "-";
      return `${marker} ${serializeInline(item, labels).trim()}`.trim();
    })
    .join("\n");
}

function serializeTable(element: Element, labels: DocumentUpdateLabels) {
  return Array.from(element.querySelectorAll("tr"))
    .map((row) =>
      Array.from(row.children)
        .map((cell) => serializeInline(cell, labels).trim())
        .join(" | "),
    )
    .filter(Boolean)
    .join("\n");
}

function serializeInline(node: Node, labels: DocumentUpdateLabels): string {
  if (node instanceof Text) {
    return node.textContent ?? "";
  }

  if (!(node instanceof Element)) {
    return "";
  }

  const tagName = node.tagName.toLowerCase();

  if (tagName === "br") {
    return "\n";
  }

  if (tagName === "img") {
    return labels.imageSingle;
  }

  const content = Array.from(node.childNodes)
    .map((child) => serializeInline(child, labels))
    .join("");

  if (tagName === "strong" || tagName === "b") {
    return `**${content}**`;
  }

  if (tagName === "em" || tagName === "i") {
    return `_${content}_`;
  }

  if (tagName === "s" || tagName === "del" || tagName === "strike") {
    return `~~${content}~~`;
  }

  if (tagName === "code") {
    return `\`${content}\``;
  }

  if (tagName === "a") {
    const href = node.getAttribute("href")?.trim();
    return href ? `[${content}](${href})` : content;
  }

  if (tagName === "p" || tagName === "div") {
    return content;
  }

  if (tagName === "th" || tagName === "td") {
    return content;
  }

  return content;
}

function getTaskState(item: Element) {
  if (item.getAttribute("data-type") !== "taskItem") {
    return null;
  }

  return item.getAttribute("data-checked") === "true" ? "x" : " ";
}
