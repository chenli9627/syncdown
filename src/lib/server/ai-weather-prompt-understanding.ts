import { generateText } from "ai";
import {
  createAiChatModel,
  type AiChatModelConfig,
} from "@/lib/server/ai-models";

export type WeatherPromptInterpretation = {
  isSingleLocationReply: boolean;
  isWeatherRequest: boolean;
  location: string | null;
  dayOffset: 0 | 1 | 2;
};

type InterpretWeatherPromptOptions = {
  modelConfig: AiChatModelConfig | null;
};

export async function interpretWeatherPrompt(
  prompt: string,
  { modelConfig }: InterpretWeatherPromptOptions,
): Promise<WeatherPromptInterpretation | null> {
  if (!maybeMentionsWeather(prompt) || !modelConfig) {
    return null;
  }

  try {
    const result = await generateText({
      maxOutputTokens: 180,
      model: createAiChatModel(modelConfig),
      prompt: buildWeatherInterpretationPrompt(prompt),
      temperature: 0,
    });

    return parseWeatherInterpretation(result.text);
  } catch {
    return null;
  }
}

function buildWeatherInterpretationPrompt(prompt: string) {
  return [
    "You classify a weather-related user request for Syncdown.",
    "Return exactly one JSON object and nothing else.",
    'Schema: {"isWeatherRequest":boolean,"isSingleLocationReply":boolean,"location":string|null,"dayOffset":0|1|2}',
    "Rules:",
    "- isWeatherRequest=true only when the user is asking about weather, forecast, or temperature.",
    "- isSingleLocationReply=true only when the user wants a normal direct weather answer for exactly one place.",
    "- If the user asks for multiple places, a comparison, a table, a list, formatting, or document insertion/editing, set isSingleLocationReply=false.",
    "- location may be any place name the user intends: country, province, city, district, county, town, village, region, scenic area, or landmark.",
    "- Strip filler words. Keep only the intended place name.",
    "- dayOffset: 0=today/current, 1=tomorrow, 2=day after tomorrow.",
    "- If no place can be determined for a single-location weather question, set location=null.",
    "",
    `User request: ${JSON.stringify(prompt)}`,
  ].join("\n");
}

function parseWeatherInterpretation(text: string): WeatherPromptInterpretation | null {
  const jsonText = extractJsonObject(text);

  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as Partial<WeatherPromptInterpretation>;

    if (typeof parsed.isWeatherRequest !== "boolean") {
      return null;
    }

    if (typeof parsed.isSingleLocationReply !== "boolean") {
      return null;
    }

    const dayOffset = normalizeDayOffset(parsed.dayOffset);
    const location = normalizeLocation(parsed.location);

    return {
      dayOffset,
      isSingleLocationReply: parsed.isSingleLocationReply,
      isWeatherRequest: parsed.isWeatherRequest,
      location,
    };
  } catch {
    return null;
  }
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenceMatch?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    return null;
  }

  return candidate.slice(start, end + 1);
}

function normalizeDayOffset(value: unknown): 0 | 1 | 2 {
  if (value === 1 || value === 2) {
    return value;
  }

  return 0;
}

function normalizeLocation(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function maybeMentionsWeather(prompt: string) {
  return /(?:天气|天气预报|气温|weather|forecast|temperature)/i.test(prompt);
}
