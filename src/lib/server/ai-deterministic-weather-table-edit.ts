import type { AiChatDocumentBlock } from "@/features/app-state/types";
import {
  cloneTableRows,
  getParsedTables,
  normalizeTableCell,
  toMarkdownTable,
} from "@/features/editor/lib/ai-chat-table-matrix";
import { resolveAiChatDocumentInsertTarget } from "@/features/editor/lib/ai-chat-document-insert-target";
import { fetchWeatherSnapshot } from "@/lib/server/ai-weather-service";

type DeterministicWeatherTableEditOptions = {
  fetchImpl?: typeof fetch;
  now?: Date;
};

const CITY_HEADER_TOKENS = ["city", "location", "地点", "城市", "城市名"];
const WEATHER_HEADER_TOKENS = ["weather", "天气", "天气情况"];
const TEMP_HEADER_TOKENS = ["temp", "temperature", "气温", "温度"];
const RAIN_HEADER_TOKENS = ["rain", "precipitation", "降水", "降雨概率", "降水概率"];
const WIND_HEADER_TOKENS = ["wind", "风速"];

export async function getDeterministicWeatherTableEditPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
  { fetchImpl = fetch, now = new Date() }: DeterministicWeatherTableEditOptions = {},
) {
  if (!/(?:天气|天气预报|气温)/i.test(prompt) || !/(?:表格|表中|表里|table)/i.test(prompt)) {
    return null;
  }

  const cities = extractCitiesFromPrompt(prompt);
  const table = findTargetWeatherTable(documentBlocks);

  if (!cities.length) {
    return null;
  }

  if (!table) {
    return buildWeatherTableInsertPayload(prompt, documentBlocks, cities, { fetchImpl, now });
  }

  const headerRow = table.rows[0] ?? [];
  const cityColumn = findHeaderIndex(headerRow, CITY_HEADER_TOKENS);

  if (cityColumn < 0) {
    return null;
  }

  const existingCities = new Set(
    table.rows
      .slice(1)
      .map((row) => normalizeTableCell(row[cityColumn] ?? ""))
      .filter(Boolean),
  );
  const missingCities = cities.filter((city) => !existingCities.has(normalizeTableCell(city)));

  if (!missingCities.length) {
    return JSON.stringify({ operations: [], summary: "表格中已包含这些城市的天气。" });
  }

  const dayOffset = /(?:明天|tomorrow)/i.test(prompt) ? 1 : /(?:后天|day after tomorrow)/i.test(prompt) ? 2 : 0;
  const snapshots = await Promise.all(
    missingCities.map((city) => fetchWeatherSnapshot(city, { dayOffset, fetchImpl, now })),
  );
  const successfulCities = snapshots.filter((snapshot): snapshot is NonNullable<typeof snapshot> => Boolean(snapshot));

  if (!successfulCities.length) {
    return JSON.stringify({
      operations: [],
      summary: "无法获取这些城市的可靠天气数据，未修改文档。",
    });
  }

  const nextRows = cloneTableRows(table.rows);
  successfulCities.forEach((snapshot) => {
    nextRows.push(
      headerRow.map((header) => {
        const normalizedHeader = normalizeTableCell(header);
        if (CITY_HEADER_TOKENS.some((token) => normalizedHeader.includes(token))) {
          return snapshot.city;
        }
        if (WEATHER_HEADER_TOKENS.some((token) => normalizedHeader.includes(token))) {
          return snapshot.weatherLabel;
        }
        if (TEMP_HEADER_TOKENS.some((token) => normalizedHeader.includes(token))) {
          return snapshot.temperatureLabel;
        }
        if (RAIN_HEADER_TOKENS.some((token) => normalizedHeader.includes(token))) {
          return typeof snapshot.precipitationProbability === "number"
            ? `${Math.round(snapshot.precipitationProbability)}%`
            : "";
        }
        if (WIND_HEADER_TOKENS.some((token) => normalizedHeader.includes(token))) {
          return snapshot.windLabel;
        }
        return "";
      }),
    );
  });

  return JSON.stringify({
    operations: [
      {
        blockId: table.block.id,
        content: toMarkdownTable(nextRows),
        type: "replace_block",
      },
    ],
    summary: `已将${successfulCities.map((city) => city.city).join("、")}的天气添加到表格中。`,
  });
}

async function buildWeatherTableInsertPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
  cities: string[],
  { fetchImpl, now }: DeterministicWeatherTableEditOptions,
) {
  if (!wantsWeatherTableInserted(prompt)) {
    return null;
  }

  const dayOffset = /(?:明天|tomorrow)/i.test(prompt) ? 1 : /(?:后天|day after tomorrow)/i.test(prompt) ? 2 : 0;
  const snapshots = await Promise.all(
    cities.map((city) => fetchWeatherSnapshot(city, { dayOffset, fetchImpl, now })),
  );
  const successfulCities = snapshots.filter((snapshot): snapshot is NonNullable<typeof snapshot> => Boolean(snapshot));

  if (!successfulCities.length) {
    return JSON.stringify({
      operations: [],
      summary: "无法获取这些城市的可靠天气数据，未修改文档。",
    });
  }

  const content = toMarkdownTable([
    ["城市", "天气", "气温", "降水概率", "风速"],
    ...successfulCities.map((snapshot) => [
      snapshot.city,
      snapshot.weatherLabel,
      snapshot.temperatureLabel,
      typeof snapshot.precipitationProbability === "number"
        ? `${Math.round(snapshot.precipitationProbability)}%`
        : "",
      snapshot.windLabel,
    ]),
  ]);
  const emptyBlock = documentBlocks.length === 1 && !documentBlocks[0]?.text.trim() ? documentBlocks[0] : null;

  if (emptyBlock) {
    return JSON.stringify({
      operations: [{ blockId: emptyBlock.id, content, type: "replace_block" }],
      summary: `已将${summarizeCityGroup(prompt, successfulCities.map((city) => city.city))}今日天气整理为表格并写入文档。`,
    });
  }

  const insertTarget = resolveAiChatDocumentInsertTarget(prompt, documentBlocks);

  if (!insertTarget) {
    return null;
  }

  return JSON.stringify({
    operations: [{ blockId: insertTarget.blockId, content, type: insertTarget.operationType }],
    summary: `已将${summarizeCityGroup(prompt, successfulCities.map((city) => city.city))}今日天气整理为表格并写入文档。`,
  });
}

function extractCitiesFromPrompt(prompt: string) {
  const match =
    prompt.match(
      /(?:添加|加入|增加|补充|追加)\s*(.+?)\s*(?:的)?(?:天气|天气预报|气温).{0,20}(?:到表格中|到表中|到表里|进表格|进表中|进表里|到table|to the table)/iu,
    ) ??
    prompt.match(
      /(?:把|将)\s*(.+?)\s*(?:的)?(?:天气|天气预报|气温).{0,20}(?:添加|加入|增加|补充|追加).{0,20}(?:表格|表中|表里|table)/iu,
    );

  const explicitCities = (match?.[1] ?? "")
    .split(/(?:、|,|，|\/|和|以及|及)/u)
    .map((part) => part.trim())
    .filter((part) => /^[\p{L}\p{N}\-.\s]{1,40}$/u.test(part));

  if (explicitCities.length) {
    return explicitCities;
  }

  if (/(?:国际|国外|海外|全球|世界).{0,16}(?:城市|大城市)|(?:城市|大城市).{0,16}(?:国际|国外|海外|全球|世界)/u.test(prompt)) {
    return ["东京", "纽约", "伦敦", "新加坡"];
  }

  if (/(?:中国|国内|全国).{0,16}(?:城市|大城市)|(?:城市|大城市).{0,16}(?:中国|国内|全国)|几个大城市|主要城市/u.test(prompt)) {
    return ["北京", "上海", "广州", "深圳", "成都", "杭州"];
  }

  return [];
}

function findTargetWeatherTable(documentBlocks: AiChatDocumentBlock[]) {
  const tables = getParsedTables(documentBlocks);
  return (
    [...tables]
      .reverse()
      .find((table) => /(?:天气|weather|气温|temperature)/i.test(table.block.text + (table.block.html ?? ""))) ??
    tables.at(-1) ??
    null
  );
}

function findHeaderIndex(headers: string[], tokens: string[]) {
  return headers.findIndex((header) =>
    tokens.some((token) => normalizeTableCell(header).includes(token)),
  );
}

function wantsWeatherTableInserted(prompt: string) {
  return /(?:添加到文档|写入文档|放到文档|放入文档|插入文档|加入文档|放到文末|放到文档末尾|表格添加到文档|生成表格)/iu.test(
    prompt,
  );
}

function summarizeCityGroup(prompt: string, cities: string[]) {
  if (/(?:中国|国内|全国).{0,16}(?:城市|大城市)|(?:城市|大城市).{0,16}(?:中国|国内|全国)|几个大城市|主要城市/u.test(prompt)) {
    return "中国几个大城市的";
  }

  if (/(?:国际|国外|海外|全球|世界).{0,16}(?:城市|大城市)|(?:城市|大城市).{0,16}(?:国际|国外|海外|全球|世界)/u.test(prompt)) {
    return "几个国际大城市的";
  }

  return cities.join("、") + "的";
}
