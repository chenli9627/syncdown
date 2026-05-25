import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiChatDocumentBlock } from "../src/features/app-state/types";
import { getDeterministicWeatherTableEditPayload } from "../src/lib/server/ai-deterministic-weather-table-edit";

const weatherTableBlocks: AiChatDocumentBlock[] = [
  {
    html: "<table><tr><th>城市</th><th>天气</th><th>气温</th><th>降水概率</th><th>风速</th></tr><tr><td>郑州</td><td>中雨</td><td>20-24°C</td><td>100%</td><td>21 km/h</td></tr></table>",
    id: "block_weather",
    text: "城市天气气温降水概率风速郑州中雨20-24°C100%21 km/h",
    type: "table",
  },
];

test("builds deterministic weather table append payloads", async () => {
  const payloadText = await getDeterministicWeatherTableEditPayload(
    "添加东京、大阪、新加坡、雅加达的天气到表格中",
    weatherTableBlocks,
    {
      fetchImpl: async (input) => {
        const url = String(input);

        if (url.includes("geocoding-api.open-meteo.com")) {
          const name = new URL(url).searchParams.get("name");
          return new Response(
            JSON.stringify({
              results: [{ latitude: 35.68, longitude: 139.76, name }],
            }),
            { status: 200 },
          );
        }

        return new Response(
          JSON.stringify({
            daily: {
              precipitation_probability_max: [35],
              temperature_2m_max: [28],
              temperature_2m_min: [21],
              weather_code: [2],
              wind_speed_10m_max: [12],
            },
          }),
          { status: 200 },
        );
      },
      now: new Date("2026-05-25T10:00:00+08:00"),
    },
  );

  assert.deepEqual(JSON.parse(payloadText ?? "{}"), {
    operations: [
      {
        blockId: "block_weather",
        content:
          "| 城市 | 天气 | 气温 | 降水概率 | 风速 |\n| --- | --- | --- | --- | --- |\n| 郑州 | 中雨 | 20-24°C | 100% | 21 km/h |\n| 东京 | 局部多云 | 21-28°C | 35% | 12 km/h |\n| 大阪 | 局部多云 | 21-28°C | 35% | 12 km/h |\n| 新加坡 | 局部多云 | 21-28°C | 35% | 12 km/h |\n| 雅加达 | 局部多云 | 21-28°C | 35% | 12 km/h |",
        type: "replace_block",
      },
    ],
    summary: "已将东京、大阪、新加坡、雅加达的天气添加到表格中。",
  });
});

test("builds deterministic domestic weather table insertion payloads for a blank document", async () => {
  const payloadText = await getDeterministicWeatherTableEditPayload(
    "放入中国几个大城市的今日天气到一个表格中，然后把表格添加到文档中",
    [{ html: "<p></p>", id: "block_blank", text: "", type: "paragraph" }],
    {
      fetchImpl: async (input) => {
        const url = String(input);

        if (url.includes("geocoding-api.open-meteo.com")) {
          const name = new URL(url).searchParams.get("name");
          return new Response(
            JSON.stringify({
              results: [{ latitude: 35.68, longitude: 139.76, name }],
            }),
            { status: 200 },
          );
        }

        return new Response(
          JSON.stringify({
            daily: {
              precipitation_probability_max: [35],
              temperature_2m_max: [28],
              temperature_2m_min: [21],
              weather_code: [2],
              wind_speed_10m_max: [12],
            },
          }),
          { status: 200 },
        );
      },
      now: new Date("2026-05-25T10:00:00+08:00"),
    },
  );

  assert.deepEqual(JSON.parse(payloadText ?? "{}"), {
    operations: [
      {
        blockId: "block_blank",
        content:
          "| 城市 | 天气 | 气温 | 降水概率 | 风速 |\n| --- | --- | --- | --- | --- |\n| 北京 | 局部多云 | 21-28°C | 35% | 12 km/h |\n| 上海 | 局部多云 | 21-28°C | 35% | 12 km/h |\n| 广州 | 局部多云 | 21-28°C | 35% | 12 km/h |\n| 深圳 | 局部多云 | 21-28°C | 35% | 12 km/h |\n| 成都 | 局部多云 | 21-28°C | 35% | 12 km/h |\n| 杭州 | 局部多云 | 21-28°C | 35% | 12 km/h |",
        type: "replace_block",
      },
    ],
    summary: "已将中国几个大城市的今日天气整理为表格并写入文档。",
  });
});

test("builds deterministic generic international weather table append payloads", async () => {
  const payloadText = await getDeterministicWeatherTableEditPayload(
    "往文档中的天气表中新增添几个国际城市的天气",
    weatherTableBlocks,
    {
      fetchImpl: async (input) => {
        const url = String(input);

        if (url.includes("geocoding-api.open-meteo.com")) {
          const name = new URL(url).searchParams.get("name");
          return new Response(
            JSON.stringify({
              results: [{ latitude: 35.68, longitude: 139.76, name }],
            }),
            { status: 200 },
          );
        }

        return new Response(
          JSON.stringify({
            daily: {
              precipitation_probability_max: [35],
              temperature_2m_max: [28],
              temperature_2m_min: [21],
              weather_code: [2],
              wind_speed_10m_max: [12],
            },
          }),
          { status: 200 },
        );
      },
      now: new Date("2026-05-25T10:00:00+08:00"),
    },
  );

  assert.deepEqual(JSON.parse(payloadText ?? "{}"), {
    operations: [
      {
        blockId: "block_weather",
        content:
          "| 城市 | 天气 | 气温 | 降水概率 | 风速 |\n| --- | --- | --- | --- | --- |\n| 郑州 | 中雨 | 20-24°C | 100% | 21 km/h |\n| 东京 | 局部多云 | 21-28°C | 35% | 12 km/h |\n| 纽约 | 局部多云 | 21-28°C | 35% | 12 km/h |\n| 伦敦 | 局部多云 | 21-28°C | 35% | 12 km/h |\n| 新加坡 | 局部多云 | 21-28°C | 35% | 12 km/h |",
        type: "replace_block",
      },
    ],
    summary: "已将东京、纽约、伦敦、新加坡的天气添加到表格中。",
  });
});
