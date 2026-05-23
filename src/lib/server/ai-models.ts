import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AiChatModelKey } from "@/features/app-state/types";

export type AiChatModelConfig = {
  apiKey: string;
  baseUrl: string;
  key: AiChatModelKey;
  model: string;
  name: string;
};

export function getAiChatModelConfig(key: AiChatModelKey) {
  const apiKey =
    key === "primary"
      ? process.env.AI_API_KEY?.trim() || process.env.ARK_API_KEY?.trim()
      : process.env.AI_SECONDARY_API_KEY?.trim() ||
        process.env.AI_API_KEY?.trim() ||
        process.env.ARK_API_KEY?.trim();
  const baseUrl =
    key === "primary"
      ? process.env.AI_BASE_URL?.trim()
      : process.env.AI_SECONDARY_BASE_URL?.trim() || process.env.AI_BASE_URL?.trim();
  const model =
    key === "primary"
      ? process.env.AI_MODEL?.trim()
      : process.env.AI_SECONDARY_MODEL?.trim();

  if (!apiKey || !baseUrl || !model) {
    return null;
  }

  return {
    apiKey,
    baseUrl,
    key,
    model,
    name: model,
  } satisfies AiChatModelConfig;
}

export function getConfiguredAiChatModels() {
  return (["primary", "secondary"] as const)
    .map((key) => getAiChatModelConfig(key))
    .filter((config): config is AiChatModelConfig => config !== null);
}

export function createAiChatModel(config: AiChatModelConfig) {
  return createOpenAICompatible({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    name: `syncdown-${config.key}`,
  }).chatModel(config.model);
}
