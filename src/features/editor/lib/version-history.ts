"use client";

import type { DocumentRecord, DocumentVersion } from "@/features/app-state/types";

export type VersionDiffPart = {
  text: string;
  type: "added" | "removed" | "unchanged";
};

export type VersionComparison = {
  currentContent: string;
  previousContent: string | null;
};

type VersionImageLabels = { single: string; plural: (count: number) => string };

type CurrentVersionTokenEntry =
  | {
      kind: "image";
      token: string;
      node: HTMLImageElement;
    }
  | {
      kind: "separator";
      token: string;
    }
  | {
      kind: "text";
      token: string;
      node: Text;
    };

type AnnotatedTextToken = {
  beforeRemoved: string;
  text: string;
  type: "added" | "unchanged";
};

type VersionBlockStats = {
  added: number;
  total: number;
};

export function getVersionComparison(
  document: Pick<DocumentRecord, "content" | "versionHistory">,
  selectedVersion: DocumentVersion | null,
): VersionComparison {
  const versions = document.versionHistory ?? [];
  const selectedIndex = selectedVersion
    ? versions.findIndex((version) => version.id === selectedVersion.id)
    : -1;

  if (!selectedVersion || selectedIndex === -1) {
    return {
      currentContent: document.content,
      previousContent: null,
    };
  }

  return {
    currentContent: selectedVersion.content,
    previousContent: versions[selectedIndex + 1]?.content ?? null,
  };
}

export function buildVersionDiffHtml(
  currentHtml: string,
  previousHtml: string,
  imageLabels?: VersionImageLabels,
) {
  const parser = new DOMParser();
  const currentDoc = parser.parseFromString(currentHtml, "text/html");
  const previousDoc = parser.parseFromString(previousHtml, "text/html");
  const currentEntries = getCurrentVersionTokenEntries(currentDoc.body, imageLabels);
  const previousTokens = getVersionTextTokens(previousDoc.body, imageLabels);
  const currentTokens = currentEntries.map((entry) => entry.token);
  const parts = diffVersionTokens(previousTokens, currentTokens);
  const statusTokens = parts.flatMap((part) =>
    tokenizeVersionText(part.text).map((token) => ({
      text: token,
      type: part.type,
    })),
  );
  const textNodeAnnotations = new Map<Text, AnnotatedTextToken[]>();
  const blockStats = new Map<Element, VersionBlockStats>();
  let statusIndex = 0;
  let pendingRemovedText = "";

  for (const entry of currentEntries) {
    while (statusTokens[statusIndex]?.type === "removed") {
      const removedText = statusTokens[statusIndex]?.text ?? "";

      if (!isWhitespaceOnly(removedText)) {
        pendingRemovedText += removedText;
      }
      statusIndex += 1;
    }

    const status = statusTokens[statusIndex];
    const entryType =
      status?.type === "added" && !isWhitespaceOnly(entry.token) ? "added" : "unchanged";

    if (status && status.type !== "removed") {
      statusIndex += 1;
    }

    if (entry.kind === "separator") {
      continue;
    }

    const beforeRemoved = pendingRemovedText;
    pendingRemovedText = "";
    updateBlockStats(currentDoc.body, entry, entryType, blockStats);

    if (entry.kind === "image") {
      insertRemovedTextBefore(entry.node, beforeRemoved);

      if (entryType === "added") {
        entry.node.style.outline = "2px solid var(--color-primary)";
        entry.node.style.outlineOffset = "2px";
      }
      continue;
    }

    const annotations = textNodeAnnotations.get(entry.node) ?? [];
    annotations.push({
      beforeRemoved,
      text: entry.token,
      type: entryType,
    });
    textNodeAnnotations.set(entry.node, annotations);
  }

  while (statusIndex < statusTokens.length) {
    const status = statusTokens[statusIndex];

    if (status?.type === "removed" && !isWhitespaceOnly(status.text)) {
      pendingRemovedText += status.text;
    }
    statusIndex += 1;
  }

  for (const [textNode, annotations] of textNodeAnnotations.entries()) {
    replaceTextNodeWithAnnotations(currentDoc, textNode, annotations);
  }

  if (pendingRemovedText) {
    currentDoc.body.append(createRemovedTextElement(currentDoc, pendingRemovedText));
  }

  applyAddedBlockStyles(blockStats);

  return currentDoc.body.innerHTML;
}

export function htmlToVersionText(html: string, imageLabels?: VersionImageLabels) {
  if (!html.trim()) {
    return "";
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks = Array.from(doc.body.children);

  if (!blocks.length) {
    return blockToVersionText(doc.body, imageLabels);
  }

  return blocks
    .map((block) => blockToVersionText(block, imageLabels))
    .filter(Boolean)
    .join("\n\n");
}

function blockToVersionText(block: Element, imageLabels?: VersionImageLabels): string {
  const images = block.querySelectorAll("img");
  const hasImage = images.length > 0;
  const text = block.textContent?.trim() ?? "";

  if (!hasImage) {
    return text;
  }

  const imageLabel = imageLabels
    ? (images.length === 1 ? imageLabels.single : imageLabels.plural(images.length))
    : (images.length === 1 ? "[Image]" : `[${images.length} Images]`);

  if (!text) {
    return imageLabel;
  }

  return `${text} ${imageLabel}`;
}

export function diffVersionText(previousText: string, currentText: string): VersionDiffPart[] {
  return diffVersionTokens(tokenizeVersionText(previousText), tokenizeVersionText(currentText));
}

function diffVersionTokens(previousTokens: string[], currentTokens: string[]): VersionDiffPart[] {
  const lengths = buildLcsLengths(previousTokens, currentTokens);
  const parts: VersionDiffPart[] = [];
  let previousIndex = 0;
  let currentIndex = 0;

  while (previousIndex < previousTokens.length && currentIndex < currentTokens.length) {
    if (previousTokens[previousIndex] === currentTokens[currentIndex]) {
      appendPart(parts, "unchanged", previousTokens[previousIndex] ?? "");
      previousIndex += 1;
      currentIndex += 1;
      continue;
    }

    if (
      (lengths[previousIndex + 1]?.[currentIndex] ?? 0) >=
      (lengths[previousIndex]?.[currentIndex + 1] ?? 0)
    ) {
      appendPart(parts, "removed", previousTokens[previousIndex] ?? "");
      previousIndex += 1;
      continue;
    }

    appendPart(parts, "added", currentTokens[currentIndex] ?? "");
    currentIndex += 1;
  }

  while (previousIndex < previousTokens.length) {
    appendPart(parts, "removed", previousTokens[previousIndex] ?? "");
    previousIndex += 1;
  }

  while (currentIndex < currentTokens.length) {
    appendPart(parts, "added", currentTokens[currentIndex] ?? "");
    currentIndex += 1;
  }

  return parts;
}

function getCurrentVersionTokenEntries(
  body: HTMLElement,
  imageLabels?: VersionImageLabels,
): CurrentVersionTokenEntry[] {
  const entries: CurrentVersionTokenEntry[] = [];
  const blocks = Array.from(body.children);

  if (!blocks.length) {
    collectCurrentTokenEntries(body, entries, imageLabels);
    return entries;
  }

  blocks.forEach((block, index) => {
    if (index > 0) {
      entries.push({ kind: "separator", token: "\n\n" });
    }
    collectCurrentTokenEntries(block, entries, imageLabels);
  });

  return entries;
}

function getVersionTextTokens(body: HTMLElement, imageLabels?: VersionImageLabels) {
  return getCurrentVersionTokenEntries(body, imageLabels).map((entry) => entry.token);
}

function collectCurrentTokenEntries(
  node: Node,
  entries: CurrentVersionTokenEntry[],
  imageLabels?: VersionImageLabels,
) {
  if (node instanceof Text) {
    for (const token of tokenizeVersionText(node.textContent ?? "")) {
      entries.push({ kind: "text", node, token });
    }
    return;
  }

  if (node instanceof HTMLImageElement) {
    entries.push({ kind: "image", node, token: getImageLabel(1, imageLabels) });
    return;
  }

  for (const child of Array.from(node.childNodes)) {
    collectCurrentTokenEntries(child, entries, imageLabels);
  }
}

function getImageLabel(count: number, imageLabels?: VersionImageLabels) {
  if (imageLabels) {
    return count === 1 ? imageLabels.single : imageLabels.plural(count);
  }

  return count === 1 ? "[Image]" : `[${count} Images]`;
}

function replaceTextNodeWithAnnotations(
  doc: Document,
  textNode: Text,
  annotations: AnnotatedTextToken[],
) {
  const fragment = doc.createDocumentFragment();

  for (const annotation of annotations) {
    if (annotation.beforeRemoved) {
      fragment.append(createRemovedTextElement(doc, annotation.beforeRemoved));
    }

    if (annotation.type === "added") {
      const added = doc.createElement("span");
      added.style.color = "var(--color-primary)";
      added.textContent = annotation.text;
      fragment.append(added);
      continue;
    }

    fragment.append(doc.createTextNode(annotation.text));
  }

  textNode.replaceWith(fragment);
}

function insertRemovedTextBefore(node: Node, text: string) {
  if (!text) {
    return;
  }

  node.parentNode?.insertBefore(createRemovedTextElement(node.ownerDocument, text), node);
}

function createRemovedTextElement(doc: Document, text: string) {
  const removed = doc.createElement("span");
  removed.style.color = "var(--color-muted-foreground)";
  removed.style.textDecoration = "line-through";
  removed.textContent = text;
  return removed;
}

function updateBlockStats(
  body: HTMLElement,
  entry: Exclude<CurrentVersionTokenEntry, { kind: "separator" }>,
  entryType: AnnotatedTextToken["type"],
  blockStats: Map<Element, VersionBlockStats>,
) {
  if (isWhitespaceOnly(entry.token)) {
    return;
  }

  const block = getTopLevelVersionBlock(body, entry.node);

  if (!block) {
    return;
  }

  const current = blockStats.get(block) ?? { added: 0, total: 0 };
  current.total += 1;

  if (entryType === "added") {
    current.added += 1;
  }

  blockStats.set(block, current);
}

function getTopLevelVersionBlock(body: HTMLElement, node: Node) {
  let current: Node | null = node;

  while (current?.parentNode && current.parentNode !== body) {
    current = current.parentNode;
  }

  return current instanceof Element ? current : null;
}

function applyAddedBlockStyles(blockStats: Map<Element, VersionBlockStats>) {
  for (const [block, stats] of blockStats.entries()) {
    if (stats.total === 0 || stats.added !== stats.total) {
      continue;
    }

    const element = block as HTMLElement;
    element.style.backgroundColor = "color-mix(in srgb, var(--color-primary) 8%, transparent)";
    element.style.borderLeft = "3px solid var(--color-primary)";
    element.style.paddingLeft = "12px";
  }
}

function isWhitespaceOnly(text: string) {
  return text.trim() === "";
}

function tokenizeVersionText(text: string) {
  return text.match(/\s+|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu) ?? [];
}

function buildLcsLengths(previousTokens: string[], currentTokens: string[]) {
  const lengths = Array.from({ length: previousTokens.length + 1 }, () =>
    Array.from({ length: currentTokens.length + 1 }, () => 0),
  );

  for (let previousIndex = previousTokens.length - 1; previousIndex >= 0; previousIndex -= 1) {
    for (let currentIndex = currentTokens.length - 1; currentIndex >= 0; currentIndex -= 1) {
      lengths[previousIndex][currentIndex] =
        previousTokens[previousIndex] === currentTokens[currentIndex]
          ? (lengths[previousIndex + 1]?.[currentIndex + 1] ?? 0) + 1
          : Math.max(
              lengths[previousIndex + 1]?.[currentIndex] ?? 0,
              lengths[previousIndex]?.[currentIndex + 1] ?? 0,
            );
    }
  }

  return lengths;
}

function appendPart(parts: VersionDiffPart[], type: VersionDiffPart["type"], text: string) {
  if (!text) {
    return;
  }

  const previous = parts[parts.length - 1];

  if (previous?.type === type) {
    previous.text += text;
    return;
  }

  parts.push({ text, type });
}
