import assert from "node:assert/strict";
import test from "node:test";
import { getDeterministicAiChatReply } from "../src/lib/server/ai-deterministic-replies";

test("returns null for ordinary non-weather prompts", async () => {
  const reply = await getDeterministicAiChatReply("介绍一下北京的历史");

  assert.equal(reply, null);
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
