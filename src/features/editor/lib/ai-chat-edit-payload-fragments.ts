const EDIT_PAYLOAD_START_PATTERN =
  /(?:^|\n)\s*\{\s*"summary"\s*:\s*"[\s\S]*?"\s*,\s*"operations"\s*:/iu;

export function containsAiEditPayloadFragment(text: string) {
  return EDIT_PAYLOAD_START_PATTERN.test(text.replace(/\r\n?/g, "\n"));
}

export function looksLikeStandaloneAiEditPayloadJson(text: string) {
  if (!/^[{\[]/.test(text) || !/"(?:summary|operations)"\s*:/.test(text)) {
    return false;
  }

  try {
    const parsed = JSON.parse(text) as { operations?: unknown; summary?: unknown };
    return typeof parsed === "object" && parsed !== null;
  } catch {
    return true;
  }
}

export function stripTrailingAiEditPayloadFragment(text: string) {
  const normalized = text.replace(/\r\n?/g, "\n").trimEnd();
  const match = normalized.match(EDIT_PAYLOAD_START_PATTERN);

  if (!match || match.index == null || match.index <= 0) {
    return normalized;
  }

  return normalized.slice(0, match.index).trimEnd();
}
