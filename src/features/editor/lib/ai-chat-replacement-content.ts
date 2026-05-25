export function preferExplicitReplacementCandidate(text: string) {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  const explicitCandidate = getLastExplicitReplacementCandidate(normalized);

  if (explicitCandidate) {
    return explicitCandidate;
  }

  return normalized;
}

function getLastExplicitReplacementCandidate(text: string) {
  const markerPattern =
    /(?:^|\n)\s*(?:精简版|简化版|修改后|改写后|润色后|优化后|更新后|最终版|新版|新版本|shortened version|simplified version|revised version|polished version|updated version|final version)\s*[:：]\s*([\s\S]*?)(?=\n\s*(?:原文|原句|原版本|original|previous version)\s*[:：]|\n\s*(?:精简版|简化版|修改后|改写后|润色后|优化后|更新后|最终版|新版|新版本|shortened version|simplified version|revised version|polished version|updated version|final version)\s*[:：]|$)/giu;

  const matches = Array.from(text.matchAll(markerPattern));
  const candidate = matches.at(-1)?.[1]?.trim();

  return candidate || null;
}
