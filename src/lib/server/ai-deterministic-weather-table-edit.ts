import type { AiChatDocumentBlock } from "@/features/app-state/types";
import {
  cloneTableRows,
  getParsedTables,
  normalizeTableCell,
  toMarkdownTable,
} from "@/features/editor/lib/ai-chat-table-matrix";
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

  if (!cities.length || !table) {
    return null;
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

function extractCitiesFromPrompt(prompt: string) {
  const match =
    prompt.match(
      /(?:添加|加入|增加|补充|追加)\s*(.+?)\s*(?:的)?(?:天气|天气预报|气温).{0,20}(?:到表格中|到表中|到表里|进表格|进表中|进表里|到table|to the table)/iu,
    ) ??
    prompt.match(
      /(?:把|将)\s*(.+?)\s*(?:的)?(?:天气|天气预报|气温).{0,20}(?:添加|加入|增加|补充|追加).{0,20}(?:表格|表中|表里|table)/iu,
    );

  return (match?.[1] ?? "")
    .split(/(?:、|,|，|\/|和|以及|及)/u)
    .map((part) => part.trim())
    .filter((part) => /^[\p{L}\p{N}\-.\s]{1,40}$/u.test(part));
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
