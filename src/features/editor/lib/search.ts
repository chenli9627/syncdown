export type SearchMatch = {
  range: Range;
};

export type SearchRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export function collectSearchMatches(root: HTMLElement, query: string) {
  if (!query) {
    return [];
  }

  const matches: SearchMatch[] = [];
  const walker = globalThis.document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    null,
  );
  const normalizedQuery = query.toLowerCase();
  let currentNode = walker.nextNode();

  while (currentNode) {
    if (currentNode instanceof Text) {
      const content = currentNode.textContent ?? "";
      const normalizedContent = content.toLowerCase();
      let searchIndex = 0;

      while (searchIndex < normalizedContent.length) {
        const matchIndex = normalizedContent.indexOf(normalizedQuery, searchIndex);

        if (matchIndex < 0) {
          break;
        }

        const range = globalThis.document.createRange();
        range.setStart(currentNode, matchIndex);
        range.setEnd(currentNode, matchIndex + normalizedQuery.length);
        matches.push({ range });
        searchIndex = matchIndex + normalizedQuery.length;
      }
    }

    currentNode = walker.nextNode();
  }

  return matches;
}

export function getSearchRects(range: Range, container: HTMLElement) {
  const containerBounds = container.getBoundingClientRect();

  return Array.from(range.getClientRects()).map((rect) => ({
    height: rect.height,
    left: rect.left - containerBounds.left,
    top: rect.top - containerBounds.top,
    width: rect.width,
  }));
}
