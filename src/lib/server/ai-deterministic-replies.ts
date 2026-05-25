import type { AiChatModelConfig } from "@/lib/server/ai-models";
import {
  interpretWeatherPrompt,
  type WeatherPromptInterpretation,
} from "@/lib/server/ai-weather-prompt-understanding";

type DeterministicReplyOptions = {
  fetchImpl?: typeof fetch;
  interpretPromptImpl?: (
    prompt: string,
    options: { modelConfig: AiChatModelConfig | null },
  ) => Promise<WeatherPromptInterpretation | null>;
  modelConfig?: AiChatModelConfig | null;
  now?: Date;
};

type GeocodingResponse = {
  results?: Array<{
    admin1?: string;
    country?: string;
    latitude: number;
    longitude: number;
    name: string;
  }>;
};

type ForecastResponse = {
  daily?: {
    precipitation_probability_max?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    time?: string[];
    weather_code?: number[];
    wind_speed_10m_max?: number[];
  };
};

export async function getDeterministicAiChatReply(
  prompt: string,
  {
    fetchImpl = fetch,
    interpretPromptImpl = interpretWeatherPrompt,
    modelConfig = null,
    now = new Date(),
  }: DeterministicReplyOptions = {},
) {
  const interpretation =
    (await interpretPromptImpl(prompt, { modelConfig })) ?? fallbackInterpretWeatherPrompt(prompt);

  if (!interpretation.isWeatherRequest || !interpretation.isSingleLocationReply) {
    return null;
  }

  const location = sanitizeLocation(interpretation.location);

  if (!location) {
    return "我还不能判断你想查哪个地点的天气。请直接说地点名，例如：今天海淀区的天气预报。";
  }

  const geocoding = await fetchGeocoding(location, fetchImpl);

  if (!geocoding) {
    return `没有找到“${location}”的天气地点信息。`;
  }

  const forecast = await fetchForecast(
    geocoding.latitude,
    geocoding.longitude,
    interpretation.dayOffset,
    fetchImpl,
  );

  if (!forecast) {
    return `暂时无法获取“${geocoding.name}”的天气预报。`;
  }

  const targetDate =
    forecast.daily?.time?.[interpretation.dayOffset] ??
    formatDateForShanghai(addDays(now, interpretation.dayOffset));
  const weatherCode = forecast.daily?.weather_code?.[interpretation.dayOffset] ?? -1;
  const high = forecast.daily?.temperature_2m_max?.[interpretation.dayOffset];
  const low = forecast.daily?.temperature_2m_min?.[interpretation.dayOffset];
  const rain = forecast.daily?.precipitation_probability_max?.[interpretation.dayOffset];
  const wind = forecast.daily?.wind_speed_10m_max?.[interpretation.dayOffset];
  const locationLabel = [geocoding.name, geocoding.admin1].filter(Boolean).join(" ");
  const weatherLabel = toWeatherDescription(weatherCode);
  const dayLabel = getWeatherDayLabel(prompt, interpretation.dayOffset);
  const tempLabel =
    typeof low === "number" && typeof high === "number"
      ? `${Math.round(low)}-${Math.round(high)}°C`
      : "暂无温度数据";
  const rainLabel = typeof rain === "number" ? `，降水概率 ${Math.round(rain)}%` : "";
  const windLabel = typeof wind === "number" ? `，最大风速 ${Math.round(wind)} km/h` : "";

  return `${locationLabel} ${dayLabel}（${targetDate}）天气预报：${weatherLabel}，${tempLabel}${rainLabel}${windLabel}。`;
}

function fallbackInterpretWeatherPrompt(prompt: string): WeatherPromptInterpretation {
  if (!looksLikeWeatherPrompt(prompt) || isComplexWeatherFormattingPrompt(prompt)) {
    return {
      dayOffset: 0,
      isSingleLocationReply: false,
      isWeatherRequest: false,
      location: null,
    };
  }

  return {
    dayOffset: getWeatherDayOffset(prompt),
    isSingleLocationReply: true,
    isWeatherRequest: true,
    location: extractWeatherLocation(prompt),
  };
}

function looksLikeWeatherPrompt(prompt: string) {
  return /(?:天气|天气预报|气温|weather|forecast|temperature)/i.test(prompt);
}

function isComplexWeatherFormattingPrompt(prompt: string) {
  return (
    /(?:表格|列表|清单|图表|对比|比较|整理|汇总|汇总成|markdown\s*表格|markdown\s*列表|几个大城市|各大城市|多个城市|多地|分别如何|分别是|城市天气表)/iu.test(
      prompt,
    ) ||
    /\b(?:table|list|chart|compare|comparison|multiple cities|several cities|major cities|markdown table|markdown list)\b/i.test(
      prompt,
    )
  );
}

function extractWeatherLocation(prompt: string) {
  const zhPatterns = [
    /(?:查一下|查查|看看|帮我查一下|请问|想知道)?(?:今天|明天|后天)?(?:的)?\s*([^\s，。！？,.]{1,20}?)(?:的)?(?:天气预报|天气|气温)/u,
    /([^\s，。！？,.]{1,20}?)(?:今天|明天|后天)(?:的)?(?:天气预报|天气|气温)/u,
  ];

  for (const pattern of zhPatterns) {
    const match = prompt.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  const enPatterns = [
    /\b(?:weather|forecast|temperature)\b(?:\s+for|\s+in)?\s+([A-Za-z][A-Za-z\s-]{1,40})/i,
    /\b(?:today|tomorrow|day after tomorrow)\b(?:'s)?\s+\b(?:weather|forecast)\b(?:\s+for|\s+in)?\s+([A-Za-z][A-Za-z\s-]{1,40})/i,
  ];

  for (const pattern of enPatterns) {
    const match = prompt.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return prompt.includes("北京") ? "北京" : null;
}

function sanitizeLocation(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .replace(
      /^(?:现在|目前|此刻|今天|明天|后天|给我|帮我|帮我看(?:看|下)?|帮我查(?:查|一下)?|帮我搜(?:一下)?|请问|我想知道|想知道|看看|查查|查一下|查一查|tell me|show me|give me|what(?:'s| is)|how(?:'s| is)|can you(?: please)?(?: tell me| check)?|please)\s*/iu,
      "",
    )
    .replace(/^(?:的|在)\s*/u, "")
    .replace(/\s*(?:这边|那边|那里|这儿|那儿)$/u, "")
    .replace(/\s*(?:天气怎么样|天气如何|天气呢|怎么样|如何)\s*$/iu, "")
    .replace(/\s*的$/u, "")
    .replace(/^(?:the\s+)?weather\s+(?:in|for)\s+/iu, "")
    .replace(/^(?:in|for)\s+/iu, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || null;
}

function getWeatherDayOffset(prompt: string) {
  if (/(?:后天|day after tomorrow)/i.test(prompt)) {
    return 2;
  }

  if (/(?:明天|tomorrow)/i.test(prompt)) {
    return 1;
  }

  return 0;
}

function getWeatherDayLabel(prompt: string, dayOffset: number) {
  if (dayOffset === 1) {
    return /tomorrow/i.test(prompt) ? "Tomorrow" : "明天";
  }

  if (dayOffset === 2) {
    return /day after tomorrow/i.test(prompt) ? "Day after tomorrow" : "后天";
  }

  return /today/i.test(prompt) ? "Today" : "今天";
}

async function fetchGeocoding(location: string, fetchImpl: typeof fetch) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", location);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", /[\u4e00-\u9fff]/u.test(location) ? "zh" : "en");
  url.searchParams.set("format", "json");

  const response = await fetchImpl(url, { headers: { accept: "application/json" } });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GeocodingResponse;
  return payload.results?.[0] ?? null;
}

async function fetchForecast(
  latitude: number,
  longitude: number,
  dayOffset: number,
  fetchImpl: typeof fetch,
) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
  );
  url.searchParams.set("forecast_days", String(Math.max(1, dayOffset + 1)));
  url.searchParams.set("timezone", "Asia/Shanghai");

  const response = await fetchImpl(url, { headers: { accept: "application/json" } });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ForecastResponse;
}

function toWeatherDescription(code: number) {
  return (
    {
      0: "晴",
      1: "大致晴朗",
      2: "局部多云",
      3: "阴",
      45: "雾",
      48: "冻雾",
      51: "小毛毛雨",
      53: "毛毛雨",
      55: "强毛毛雨",
      56: "小冻毛毛雨",
      57: "强冻毛毛雨",
      61: "小雨",
      63: "中雨",
      65: "大雨",
      66: "小冻雨",
      67: "强冻雨",
      71: "小雪",
      73: "中雪",
      75: "大雪",
      77: "雪粒",
      80: "小阵雨",
      81: "中阵雨",
      82: "强阵雨",
      85: "小阵雪",
      86: "强阵雪",
      95: "雷暴",
      96: "伴有小冰雹的雷暴",
      99: "伴有强冰雹的雷暴",
    }[code] ?? "天气情况未知"
  );
}

function formatDateForShanghai(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(date);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
