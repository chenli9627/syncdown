import type { AiChatDocumentBlock } from "@/features/app-state/types";
import type {
  HeadingLevel,
  InlineMarkName,
} from "@/features/editor/lib/ai-chat-document-edit-types";

const headingLevelMap: Record<string, HeadingLevel> = {
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "\u4e00": 1,
  "\u4e8c": 2,
  "\u4e09": 3,
  "\u56db": 4,
  "\u4e94": 5,
  "\u516d": 6,
};

export function cleanTarget(value: string | undefined) {
  return cleanValue(value)
    .replace(
      /^(?:\u6587\u6863\u91cc|\u6587\u4e2d|\u6b63\u6587\u91cc|\u9875\u9762\u91cc|\u4efb\u52a1\u91cc\u7684?|\u4efb\u52a1\u4e2d\u7684?|\u5217\u8868\u91cc|\u8868\u683c\u91cc|\u884c\u7a0b\u8868\u91cc|\u7f8e\u98df\u91cc|\u666f\u70b9\u91cc)/u,
      "",
    )
    .replace(/^(?:\u6240\u6709\u7684?|\u5168\u90e8\u7684?)/u, "")
    .replace(
      /(?:\u8fd9\u4e00\u884c|\u8fd9\u884c|\u8fd9\u4e00\u6bb5|\u8fd9\u6bb5|\u8fd9\u4e2a\u4efb\u52a1|\u8fd9\u4e2a\u6807\u9898|\u8fd9\u4e2a\u8bcd|\u8fd9\u4e2a\u5b57)$/u,
      "",
    )
    .trim();
}

export function cleanValue(value: string | undefined) {
  return (value ?? "")
    .trim()
    .replace(/^[“"'`\s]+|[”"'`\s]+$/g, "")
    .replace(/[。！？]+$/u, "")
    .trim();
}

export function findSingleBlockContaining(
  blocks: AiChatDocumentBlock[],
  targetText: string,
  types?: string[],
) {
  const matches = findBlocksContaining(blocks, targetText, types);
  return matches.length === 1 ? matches[0] : null;
}

export function findBlocksContaining(
  blocks: AiChatDocumentBlock[],
  targetText: string,
  types?: string[],
) {
  return blocks.filter((block) => {
    if (types?.length && !types.includes(block.type)) {
      return false;
    }

    return normalizeComparable(block.text).includes(normalizeComparable(targetText));
  });
}

export function getFirstMatchGroup(prompt: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return "";
}

export function normalizeComparable(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

export function resolveTextMarkInstruction(prompt: string) {
  const definitions: Array<{
    label: string;
    mark: InlineMarkName;
    patterns: RegExp[];
    token: RegExp;
  }> = [
    {
      label: "\u7c97\u4f53",
      mark: "bold",
      patterns: [
        /(?:\u628a|\u5c06|\u7ed9)\s*(?:\u6240\u6709(?:\u7684)?|\u5168\u90e8(?:\u7684)?)?\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,48}?)\s*(?:\u90fd)?(?:\u52a0\u7c97|\u7c97\u4f53)/iu,
      ],
      token: /(?:\u52a0\u7c97|\u7c97\u4f53|\bbold\b)/i,
    },
    {
      label: "\u659c\u4f53",
      mark: "italic",
      patterns: [
        /(?:\u628a|\u5c06|\u7ed9)\s*(?:\u6240\u6709(?:\u7684)?|\u5168\u90e8(?:\u7684)?)?\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,48}?)\s*(?:\u90fd)?\u659c\u4f53/iu,
      ],
      token: /(?:\u659c\u4f53|\bitalic\b)/i,
    },
    {
      label: "\u5220\u9664\u7ebf",
      mark: "strike",
      patterns: [
        /(?:\u628a|\u5c06|\u7ed9)\s*(?:\u6240\u6709(?:\u7684)?|\u5168\u90e8(?:\u7684)?)?\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,48}?)\s*(?:\u90fd)?(?:\u5220\u9664\u7ebf|\u4e2d\u5212\u7ebf)/iu,
      ],
      token: /(?:\u5220\u9664\u7ebf|\u4e2d\u5212\u7ebf|\bstrikethrough\b)/i,
    },
    {
      label: "\u884c\u5185\u4ee3\u7801",
      mark: "code",
      patterns: [
        /(?:\u628a|\u5c06|\u7ed9)\s*(?:\u6240\u6709(?:\u7684)?|\u5168\u90e8(?:\u7684)?)?\s*([^\n,\uff0c\u3002\uff01\uff1f]{1,48}?)\s*(?:\u90fd)?(?:\u884c\u5185\u4ee3\u7801|\u4ee3\u7801\u683c\u5f0f)/iu,
      ],
      token: /(?:\u884c\u5185\u4ee3\u7801|\u4ee3\u7801\u683c\u5f0f|\binline code\b)/i,
    },
  ];

  const definition = definitions.find((candidate) => candidate.token.test(prompt));
  if (!definition) {
    return null;
  }

  return {
    ...definition,
    applyAll: /(?:\u6240\u6709|\u5168\u90e8|\ball\b|\bevery\b)/i.test(prompt),
    set: !/(?:\u53d6\u6d88|\u53bb\u6389|\u79fb\u9664|\u6e05\u9664|\bremove\b|\bunset\b|\bclear\b)/i.test(
      prompt,
    ),
  };
}

export function toHeadingLevel(value: string | undefined) {
  return value ? headingLevelMap[value.trim()] ?? null : null;
}
