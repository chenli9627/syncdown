import type { AiChatDocumentBlock } from "@/features/app-state/types";

export function getTranslationReplacementFallback(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
) {
  if (!isTranslationReplacementPrompt(prompt)) {
    return null;
  }

  const translationHeadingIndex = documentBlocks.findIndex(
    (block) => block.type === "heading" && isTranslationHeadingText(block.text),
  );

  if (translationHeadingIndex >= 0) {
    for (let index = translationHeadingIndex + 1; index < documentBlocks.length; index += 1) {
      const block = documentBlocks[index];

      if (!block) {
        break;
      }

      if (block.type === "heading") {
        break;
      }

      if (looksLikeEnglishTranslationBlock(block.text)) {
        return {
          blockId: block.id,
          kind: "replace_block" as const,
          summary: "已更新当前英文翻译。",
        };
      }
    }
  }

  const translationBlocks = documentBlocks.filter(
    (block) => block.type !== "heading" && looksLikeEnglishTranslationBlock(block.text),
  );

  const targetBlock = translationBlocks[translationBlocks.length - 1];

  if (!targetBlock) {
    return null;
  }

  return {
    blockId: targetBlock.id,
    kind: "replace_block" as const,
    summary: "已更新当前英文翻译。",
  };
}

function isTranslationReplacementPrompt(prompt: string) {
  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");
  const lowerPrompt = prompt.toLowerCase();

  if (
    !/(?:英文翻译|英文版|英文版本|英语翻译|英译|英文译文|英文内容|英文段落|英文总结|english translation|english version)/i.test(
      prompt,
    )
  ) {
    return false;
  }

  return (
    /(?:英文翻译|英文版|英文版本|英语翻译|英译|英文译文|英文内容|英文段落|英文总结).{0,24}(?:精简|缩短|简化|润色|改写|重写|优化|修改|更新|替换|完善|补充)/.test(
      compactPrompt,
    ) ||
    /(?:精简|缩短|简化|润色|改写|重写|优化|修改|更新|替换|完善|补充).{0,24}(?:英文翻译|英文版|英文版本|英语翻译|英译|英文译文|英文内容|英文段落|英文总结)/.test(
      compactPrompt,
    ) ||
    /\b(?:shorten|simplify|polish|rewrite|revise|improve|update|replace|expand)\b[\s\S]{0,80}\b(?:english translation|english version)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:english translation|english version)\b[\s\S]{0,80}\b(?:shorten|simplify|polish|rewrite|revise|improve|update|replace|expand)\b/.test(
      lowerPrompt,
    )
  );
}

function isTranslationHeadingText(text: string) {
  return /^(?:英文翻译|英文版|英文版本|英语翻译|英译|english translation|english version)$/iu.test(
    text.trim(),
  );
}

function looksLikeEnglishTranslationBlock(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return false;
  }

  const latinMatches = trimmed.match(/[A-Za-z]/g) ?? [];
  const hanMatches = trimmed.match(/\p{Script=Han}/gu) ?? [];
  const latinCount = latinMatches.length;
  const hanCount = hanMatches.length;
  const totalLetterCount = latinCount + hanCount;
  const englishWordCount = (trimmed.match(/\b[A-Za-z][A-Za-z'-]*\b/g) ?? []).length;

  if (latinCount < 24 || englishWordCount < 6) {
    return false;
  }

  if (hanCount === 0) {
    return true;
  }

  return totalLetterCount > 0 && latinCount / totalLetterCount >= 0.55;
}
