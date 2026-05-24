import type { AiChatResponseMode } from "@/features/app-state/types";

export function inferAiChatResponseMode(prompt: string): AiChatResponseMode | null {
  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");
  const lowerPrompt = prompt.toLowerCase();

  if (isTableTransformPrompt(compactPrompt, lowerPrompt)) {
    return "table";
  }

  if (isKeyPointsTransformPrompt(compactPrompt, lowerPrompt)) {
    return "key_points";
  }

  if (isListTransformPrompt(compactPrompt, lowerPrompt)) {
    return "list";
  }

  return null;
}

function isListTransformPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:整理|改成|改为|转成|转换成|做成|写成|变成).{0,16}(?:列表|清单|条目)/.test(
      compactPrompt,
    ) ||
    /(?:列表|清单|条目).{0,16}(?:整理|改成|改为|转成|转换成|做成|写成|变成)/.test(
      compactPrompt,
    ) ||
    /\b(?:list|bullet list|bullets?)\b/.test(lowerPrompt)
  );
}

function isTableTransformPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:整理|改成|改为|转成|转换成|做成|写成|变成).{0,16}(?:表格)/.test(compactPrompt) ||
    /(?:表格).{0,16}(?:整理|改成|改为|转成|转换成|做成|写成|变成)/.test(
      compactPrompt,
    ) ||
    /\b(?:table|markdown table|tabular)\b/.test(lowerPrompt)
  );
}

function isKeyPointsTransformPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:整理|提炼|总结|概括|归纳|改成|做成|转成).{0,16}(?:要点|重点|关键点|关键要点)/.test(
      compactPrompt,
    ) ||
    /(?:要点|重点|关键点|关键要点).{0,16}(?:整理|提炼|总结|概括|归纳|改成|做成|转成)/.test(
      compactPrompt,
    ) ||
    /\b(?:key points?|bullet points?|highlights?)\b/.test(lowerPrompt)
  );
}
