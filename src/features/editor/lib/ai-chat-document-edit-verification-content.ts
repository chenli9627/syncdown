export function getExpectedContentText(content: string | undefined) {
  return (content ?? "")
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[^\n`]*|```/g, ""))
    .replace(/^`{2,3}[^\s`]*\s*$/gm, "")
    .replace(/^\s*\|?\s*:?-{1,}:?\s*(?:\|\s*:?-{1,}:?\s*)+\|?\s*$/gm, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/[>#|-]/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getExpectedContentSegments(content: string | undefined) {
  const normalizedBlocks = (content ?? "")
    .replace(/^`{2,3}[^\s`]*\s*$/gm, "")
    .replace(/<\/(?:p|h[1-6]|li|tr|blockquote|pre)>/gi, "\n\n")
    .replace(/<(?:p|h[1-6]|li|tr|blockquote|pre)\b[^>]*>/gi, "\n\n")
    .split(/\n{2,}/)
    .map(getExpectedContentText)
    .filter((segment) => segment.length > 0);

  return normalizedBlocks.length ? normalizedBlocks : [getExpectedContentText(content)].filter(Boolean);
}
