import { cleanValue } from "@/features/editor/lib/ai-chat-deterministic-document-edit-utils";

export function extractStructuredValues(prompt: string) {
  const source =
    prompt.match(/(?:内容|值|分别是)(?:是|为)?\s*([^\n]{1,240})/u)?.[1] ??
    prompt.match(/[：:]\s*([^\n]{1,240})/u)?.[1] ??
    "";
  return splitStructuredValues(source);
}

export function splitStructuredValues(value: string) {
  return value
    .split(/(?:\s*[|｜]\s*|\s*[、,，;；]\s*)/u)
    .map((part) => cleanValue(part))
    .filter(Boolean);
}

export function toSizedCells(values: string[], size: number) {
  return Array.from({ length: size }, (_, index) => values[index] ?? "");
}

export function toColumnValues(values: string[], size: number) {
  if (!size) {
    return [];
  }

  if (!values.length) {
    return Array.from({ length: size }, () => "");
  }

  if (values.length === 1) {
    return Array.from({ length: size }, () => values[0] ?? "");
  }

  return Array.from({ length: size }, (_, index) => values[index] ?? "");
}
