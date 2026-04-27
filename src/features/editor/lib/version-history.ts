"use client";

export type VersionDiffPart = {
  text: string;
  type: "added" | "removed" | "unchanged";
};

export function htmlToVersionText(html: string) {
  if (!html.trim()) {
    return "";
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks = Array.from(doc.body.children);

  if (!blocks.length) {
    return doc.body.textContent?.trim() ?? "";
  }

  return blocks
    .map((block) => block.textContent?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n");
}

export function diffVersionText(previousText: string, currentText: string): VersionDiffPart[] {
  const previousTokens = tokenizeVersionText(previousText);
  const currentTokens = tokenizeVersionText(currentText);
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
