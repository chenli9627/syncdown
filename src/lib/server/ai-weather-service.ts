import { getWeatherGeocodingSearchNames } from "@/lib/server/ai-weather-location";

type GeocodingResponse = {
  results?: Array<{
    admin1?: string;
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
    weather_code?: number[];
    wind_speed_10m_max?: number[];
  };
};

export type WeatherSnapshot = {
  admin1?: string;
  city: string;
  precipitationProbability?: number;
  temperatureLabel: string;
  weatherLabel: string;
  windLabel: string;
};

export async function fetchWeatherSnapshot(
  city: string,
  { dayOffset = 0, fetchImpl = fetch, now = new Date() }: {
    dayOffset?: number;
    fetchImpl?: typeof fetch;
    now?: Date;
  } = {},
) {
  const geocoding = await fetchGeocoding(city, fetchImpl);

  if (!geocoding) {
    return null;
  }

  const forecast = await fetchForecast(geocoding.latitude, geocoding.longitude, dayOffset, fetchImpl);

  if (!forecast) {
    return null;
  }

  const low = forecast.daily?.temperature_2m_min?.[dayOffset];
  const high = forecast.daily?.temperature_2m_max?.[dayOffset];
  const rain = forecast.daily?.precipitation_probability_max?.[dayOffset];
  const wind = forecast.daily?.wind_speed_10m_max?.[dayOffset];
  const code = forecast.daily?.weather_code?.[dayOffset] ?? -1;

  return {
    admin1: geocoding.admin1,
    city: geocoding.name || city,
    precipitationProbability: rain,
    temperatureLabel:
      typeof low === "number" && typeof high === "number"
        ? `${Math.round(low)}-${Math.round(high)}°C`
        : formatDate(now),
    weatherLabel: toWeatherDescription(code),
    windLabel: typeof wind === "number" ? `${Math.round(wind)} km/h` : "",
  } satisfies WeatherSnapshot;
}

async function fetchGeocoding(location: string, fetchImpl: typeof fetch) {
  for (const searchName of getGeocodingSearchNames(location)) {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", searchName);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", /[\u4e00-\u9fff]/u.test(searchName) ? "zh" : "en");
    url.searchParams.set("format", "json");
    const response = await fetchImpl(url, { headers: { accept: "application/json" } });

    if (!response.ok) {
      continue;
    }

    const payload = (await response.json()) as GeocodingResponse;
    const result = payload.results?.[0];

    if (result) {
      return result;
    }
  }

  return null;
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
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max");
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
      61: "小雨",
      63: "中雨",
      65: "大雨",
      80: "小阵雨",
      81: "中阵雨",
      82: "强阵雨",
      95: "雷暴",
    }[code] ?? "天气情况未知"
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getGeocodingSearchNames(location: string) {
  return getWeatherGeocodingSearchNames(location);
}
