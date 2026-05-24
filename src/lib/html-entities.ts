const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  brvbar: "\u00a6",
  bull: "\u2022",
  cent: "\u00a2",
  copy: "\u00a9",
  deg: "\u00b0",
  divide: "\u00f7",
  euro: "\u20ac",
  frac12: "\u00bd",
  frac14: "\u00bc",
  frac34: "\u00be",
  gt: ">",
  hellip: "\u2026",
  laquo: "\u00ab",
  ldquo: "\u201c",
  lsaquo: "\u2039",
  lsquo: "\u2018",
  lt: "<",
  macr: "\u00af",
  mdash: "\u2014",
  middot: "\u00b7",
  nbsp: " ",
  ndash: "\u2013",
  not: "\u00ac",
  para: "\u00b6",
  plusmn: "\u00b1",
  pound: "\u00a3",
  quot: '"',
  raquo: "\u00bb",
  rdquo: "\u201d",
  reg: "\u00ae",
  rsaquo: "\u203a",
  rsquo: "\u2019",
  sect: "\u00a7",
  shy: "\u00ad",
  times: "\u00d7",
  trade: "\u2122",
  yen: "\u00a5",
};

export function decodeHtmlEntities(input: string) {
  return input
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);/gi, (match, entity: string) => {
      if (entity.startsWith("#x")) {
        return safeCodePoint(Number.parseInt(entity.slice(2), 16), match);
      }

      if (entity.startsWith("#")) {
        return safeCodePoint(Number.parseInt(entity.slice(1), 10), match);
      }

      return HTML_ENTITY_MAP[entity.toLowerCase()] ?? match;
    })
    .replace(/\u00a0/g, " ");
}

function safeCodePoint(codePoint: number, fallback: string) {
  if (!Number.isFinite(codePoint) || codePoint < 0) {
    return fallback;
  }

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return fallback;
  }
}
