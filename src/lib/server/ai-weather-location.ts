const CHINESE_LOCATION_UNITS = ["省", "市", "州", "县", "区", "镇", "乡", "旗", "盟", "村"];

const LOCATION_ALIAS_MAP = {
  柏林: "Berlin",
  曼谷: "Bangkok",
  东京: "Tokyo",
  大阪: "Osaka",
  旧金山: "San Francisco",
  伦敦: "London",
  洛杉矶: "Los Angeles",
  巴黎: "Paris",
  纽约: "New York",
  首尔: "Seoul",
  新加坡: "Singapore",
  悉尼: "Sydney",
  雅加达: "Jakarta",
} as const;

export function getWeatherGeocodingSearchNames(location: string) {
  const trimmed = location.trim();

  if (!trimmed) {
    return [];
  }

  const variants = new Set<string>();
  addLocationVariant(variants, trimmed);

  const alias = LOCATION_ALIAS_MAP[trimmed as keyof typeof LOCATION_ALIAS_MAP];
  if (alias) {
    addLocationVariant(variants, alias);
  }

  if (/[\u4e00-\u9fff]/u.test(trimmed)) {
    const segments = getChineseLocationSegments(trimmed);

    for (const segment of segments.slice(1)) {
      addLocationVariant(variants, segment);
      addLocationVariant(variants, stripChineseLocationUnit(segment));
    }

    addLocationVariant(variants, stripChineseLocationUnit(trimmed));
  } else {
    for (const segment of trimmed.split(/\s*,\s*/)) {
      addLocationVariant(variants, segment);
    }
  }

  return [...variants];
}

function getChineseLocationSegments(location: string) {
  const matches = location.match(/.*?[省市州县区镇乡旗盟村]/gu);

  if (!matches?.length) {
    return [location];
  }

  const segments = matches
    .map((segment) => segment.trim())
    .filter(Boolean);
  const candidates: string[] = [];

  for (let index = 0; index < segments.length; index += 1) {
    candidates.push(segments.slice(index).join(""));
  }

  candidates.push(segments[segments.length - 1] ?? location);
  return candidates;
}

function stripChineseLocationUnit(value: string) {
  const trimmed = value.trim();

  if (trimmed.length <= 1) {
    return trimmed;
  }

  const lastChar = trimmed.at(-1) ?? "";
  return CHINESE_LOCATION_UNITS.includes(lastChar) ? trimmed.slice(0, -1) : trimmed;
}

function addLocationVariant(variants: Set<string>, value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return;
  }

  variants.add(normalized);
}
