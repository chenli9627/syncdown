import assert from "node:assert/strict";
import test from "node:test";
import { getDeterministicAiChatReply } from "../src/lib/server/ai-deterministic-replies";

test("returns null for ordinary non-weather prompts", async () => {
  const reply = await getDeterministicAiChatReply("介绍一下北京的历史");

  assert.equal(reply, null);
  assert.equal(
    await getDeterministicAiChatReply("给我一个中国几个大城市今日天气表，不要修改文档。"),
    null,
  );
  assert.equal(
    await getDeterministicAiChatReply("今天北京上海广州深圳成都杭州的天气分别如何？请用 markdown 表格回答。"),
    null,
  );
});

test("returns deterministic weather reply for chinese city prompt", async () => {
  const calls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    const url = String(input);
    calls.push(url);

    if (url.startsWith("https://geocoding-api.open-meteo.com/")) {
      return new Response(
        JSON.stringify({
          results: [
            {
              admin1: "北京市",
              latitude: 39.9042,
              longitude: 116.4074,
              name: "北京",
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({
        daily: {
          precipitation_probability_max: [25],
          temperature_2m_max: [27.2],
          temperature_2m_min: [16.4],
          time: ["2026-05-25"],
          weather_code: [3],
          wind_speed_10m_max: [19.1],
        },
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  }) as typeof fetch;

  const reply = await getDeterministicAiChatReply("查一下今天北京的天气预报", {
    fetchImpl,
    now: new Date("2026-05-25T08:00:00+08:00"),
  });

  assert.equal(calls.length, 2);
  assert.match(reply ?? "", /北京 北京市/u);
  assert.match(reply ?? "", /今天（2026-05-25）/u);
  assert.match(reply ?? "", /阴/u);
  assert.match(reply ?? "", /16-27°C/u);
  assert.match(reply ?? "", /降水概率 25%/u);
});

test("parses chinese weather prompts with connector words around the city name", async () => {
  const geocodingNames: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    const url = new URL(String(input));

    if (url.hostname === "geocoding-api.open-meteo.com") {
      const name = url.searchParams.get("name") ?? "";
      geocodingNames.push(name);

      return new Response(
        JSON.stringify({
          results: [
            {
              admin1: "河南省",
              latitude: 32.146,
              longitude: 114.091,
              name: "信阳",
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({
        daily: {
          precipitation_probability_max: [40],
          temperature_2m_max: [28.1],
          temperature_2m_min: [20.2],
          time: ["2026-05-25"],
          weather_code: [2],
          wind_speed_10m_max: [12.4],
        },
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  }) as typeof fetch;

  const reply = await getDeterministicAiChatReply("今天的信阳天气", {
    fetchImpl,
    now: new Date("2026-05-25T08:00:00+08:00"),
  });

  assert.deepEqual(geocodingNames, ["信阳"]);
  assert.match(reply ?? "", /信阳 河南省/u);
});

test("supports county and district weather locations through model interpretation", async () => {
  const geocodingNames: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    const url = new URL(String(input));

    if (url.hostname === "geocoding-api.open-meteo.com") {
      const name = url.searchParams.get("name") ?? "";
      geocodingNames.push(name);

      return new Response(
        JSON.stringify({
          results: [
            {
              admin1: "北京市",
              latitude: 39.9593,
              longitude: 116.2985,
              name: "海淀区",
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({
        daily: {
          precipitation_probability_max: [15],
          temperature_2m_max: [29.5],
          temperature_2m_min: [18.2],
          time: ["2026-05-25"],
          weather_code: [1],
          wind_speed_10m_max: [10.1],
        },
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  }) as typeof fetch;

  const reply = await getDeterministicAiChatReply("海淀区现在天气怎么样", {
    fetchImpl,
    interpretPromptImpl: async () => ({
      dayOffset: 0,
      isSingleLocationReply: true,
      isWeatherRequest: true,
      location: "海淀区",
    }),
    now: new Date("2026-05-25T08:00:00+08:00"),
  });

  assert.deepEqual(geocodingNames, ["海淀区"]);
  assert.match(reply ?? "", /海淀区 北京市/u);
});

test("supports town-level weather locations through model interpretation", async () => {
  const geocodingNames: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    const url = new URL(String(input));

    if (url.hostname === "geocoding-api.open-meteo.com") {
      const name = url.searchParams.get("name") ?? "";
      geocodingNames.push(name);

      return new Response(
        JSON.stringify({
          results: [
            {
              admin1: "浙江省",
              latitude: 29.3056,
              longitude: 120.0754,
              name: "佛堂镇",
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({
        daily: {
          precipitation_probability_max: [55],
          temperature_2m_max: [31.4],
          temperature_2m_min: [22.8],
          time: ["2026-05-25"],
          weather_code: [61],
          wind_speed_10m_max: [7.8],
        },
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  }) as typeof fetch;

  const reply = await getDeterministicAiChatReply("佛堂镇今天会下雨吗", {
    fetchImpl,
    interpretPromptImpl: async () => ({
      dayOffset: 0,
      isSingleLocationReply: true,
      isWeatherRequest: true,
      location: "佛堂镇",
    }),
    now: new Date("2026-05-25T08:00:00+08:00"),
  });

  assert.deepEqual(geocodingNames, ["佛堂镇"]);
  assert.match(reply ?? "", /佛堂镇 浙江省/u);
});

test("falls back from county-level composite locations to narrower geocoding candidates", async () => {
  const geocodingNames: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    const url = new URL(String(input));

    if (url.hostname === "geocoding-api.open-meteo.com") {
      const name = url.searchParams.get("name") ?? "";
      geocodingNames.push(name);

      if (name === "信阳市罗山县" || name === "罗山县") {
        return new Response(
          JSON.stringify({ results: [] }),
          { headers: { "Content-Type": "application/json" }, status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          results: [
            {
              admin1: "河南省",
              latitude: 32.203,
              longitude: 114.531,
              name: "罗山",
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({
        daily: {
          precipitation_probability_max: [32],
          temperature_2m_max: [26.4],
          temperature_2m_min: [19.1],
          time: ["2026-05-25"],
          weather_code: [63],
          wind_speed_10m_max: [8.6],
        },
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  }) as typeof fetch;

  const reply = await getDeterministicAiChatReply("今天信阳市罗山县的天气", {
    fetchImpl,
    interpretPromptImpl: async () => ({
      dayOffset: 0,
      isSingleLocationReply: true,
      isWeatherRequest: true,
      location: "信阳市罗山县",
    }),
    now: new Date("2026-05-25T08:00:00+08:00"),
  });

  assert.deepEqual(geocodingNames, ["信阳市罗山县", "罗山县", "罗山"]);
  assert.match(reply ?? "", /罗山 河南省/u);
});
