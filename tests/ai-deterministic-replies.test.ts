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
