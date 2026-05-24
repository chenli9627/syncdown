"use client";

export function handleMarkdownAnchorClick(link: HTMLAnchorElement) {
  const href = link.getAttribute("href") ?? "";

  if (!href.startsWith("#") || href.startsWith("#footnote-") || href.startsWith("#footnote-ref-")) {
    return false;
  }

  const editorRoot = link.closest(".ProseMirror");

  if (!isQueryRootLike(editorRoot)) {
    return false;
  }

  const targetHeading = findHeadingForAnchor(editorRoot, href);

  if (!isScrollableElementLike(targetHeading)) {
    return false;
  }

  targetHeading.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  return true;
}

export function findHeadingForAnchor(root: ParentNode, href: string) {
  const target = parseMarkdownAnchorTarget(href);

  if (!target.anchor) {
    return null;
  }

  const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  let matchIndex = 0;

  for (const heading of headings) {
    const text = heading.textContent?.trim() ?? "";

    if (!text) {
      continue;
    }

    if (normalizeMarkdownAnchor(text) !== target.anchor) {
      continue;
    }

    matchIndex += 1;

    if (matchIndex === target.occurrence) {
      return heading;
    }
  }

  return null;
}

function isQueryRootLike(value: unknown): value is ParentNode & {
  querySelectorAll: (selectors: string) => ArrayLike<Element>;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "querySelectorAll" in value &&
    typeof (value as { querySelectorAll?: unknown }).querySelectorAll === "function"
  );
}

function isScrollableElementLike(value: unknown): value is Element & {
  scrollIntoView: (options?: ScrollIntoViewOptions) => void;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "scrollIntoView" in value &&
    typeof (value as { scrollIntoView?: unknown }).scrollIntoView === "function"
  );
}

export function normalizeMarkdownAnchor(value: string) {
  const withoutHash = value.replace(/^#/, "").trim();

  if (!withoutHash) {
    return "";
  }

  return decodeURIComponent(withoutHash)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function parseMarkdownAnchorTarget(href: string) {
  const decoded = decodeURIComponent(href.replace(/^#/, "").trim()).normalize("NFKC").toLowerCase();
  const occurrenceMatch = decoded.match(/^(.*?)-(\d+)$/);
  const occurrence = occurrenceMatch ? Number.parseInt(occurrenceMatch[2] ?? "1", 10) : 1;
  const anchorSource =
    occurrenceMatch && occurrence > 1 ? (occurrenceMatch[1] ?? "") : decoded;

  return {
    anchor: normalizeMarkdownAnchor(anchorSource),
    occurrence: Number.isFinite(occurrence) && occurrence > 1 ? occurrence : 1,
  };
}
