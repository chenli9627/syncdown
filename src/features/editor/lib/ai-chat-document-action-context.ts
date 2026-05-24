import type { AiChatDocumentBlock } from "@/features/app-state/types";

type AiChatDocumentActionContext = {
  documentBlocks?: AiChatDocumentBlock[];
  documentText?: string;
};

export function matchesCurrentDocumentMutationContext(
  prompt: string,
  context: AiChatDocumentActionContext = {},
) {
  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");
  const lowerPrompt = prompt.toLowerCase();
  const normalizedDocumentText = normalizeSearchText(
    buildDocumentSearchText(context.documentText, context.documentBlocks),
  );

  if (!normalizedDocumentText) {
    return false;
  }

  if (hasExactReplacementTargetInDocument(prompt, normalizedDocumentText)) {
    return true;
  }

  if (hasExactRemovalTargetInDocument(prompt, normalizedDocumentText)) {
    return true;
  }

  if (
    hasTaskListBlock(context.documentBlocks) &&
    /(?:勾选|选中|取消勾选|取消选中|完成|取消完成).{0,40}(?:任务|待办|task|checkbox)/i.test(
      compactPrompt,
    )
  ) {
    return true;
  }

  if (
    hasTableBlock(context.documentBlocks) &&
    /(?:表格|行程表|单元格|第[一二三四五六七八九十\d]+行|第[一二三四五六七八九十\d]+列|day\d+|day\d+的备注|备注|日期|地点).{0,48}(?:改成|改为|替换|更新|删除|新增|插入|移除)/i.test(
      compactPrompt,
    )
  ) {
    return true;
  }

  if (
    hasLinkBlock(context.documentBlocks) &&
    /(?:链接|超链接|网址|url|href).{0,48}(?:改成|改为|替换|更新|保留|删除|移除|取消)/i.test(
      compactPrompt,
    )
  ) {
    return true;
  }

  if (
    /\b(?:change|replace|update|rename|delete|remove)\b/.test(lowerPrompt) &&
    hasExactEnglishTargetInDocument(lowerPrompt, normalizedDocumentText)
  ) {
    return true;
  }

  return false;
}

function buildDocumentSearchText(
  documentText?: string,
  documentBlocks?: AiChatDocumentBlock[],
) {
  const parts = [documentText ?? ""];

  for (const block of documentBlocks ?? []) {
    parts.push(block.text);
    parts.push(block.markdown ?? "");
    parts.push(block.html ?? "");
  }

  return parts.join("\n");
}

function hasExactReplacementTargetInDocument(prompt: string, normalizedDocumentText: string) {
  const patterns = [
    /(?:把|将)\s*([^\n，。！？]{1,48}?)\s*(?:改成|改为|替换成|替换为|替换掉|替换)\s*([^\n，。！？]{1,80})/,
    /(?:把|将)\s*([^\n，。！？]{1,48}?)\s*(?:设为|设置为|变成)\s*([^\n，。！？]{1,80})/,
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (!match) {
      continue;
    }

    const target = normalizeSearchText(cleanPromptTarget(match[1] ?? ""));
    const replacement = normalizeSearchText(cleanPromptTarget(match[2] ?? ""));

    if (target && replacement && target !== replacement && normalizedDocumentText.includes(target)) {
      return true;
    }
  }

  return false;
}

function hasExactRemovalTargetInDocument(prompt: string, normalizedDocumentText: string) {
  const patterns = [
    /(?:删除|移除|删掉|去掉)\s*([^\n，。！？]{1,48}?)(?:这一行|这行|这一段|这段|这个任务|这个标题|这个词|这个字)?(?:[，。！？]|$)/,
    /(?:删除|移除|删掉|去掉)包含[“"'`]?([^“"'`\n]{1,48})[”"'`]?/,
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (!match) {
      continue;
    }

    const target = normalizeSearchText(cleanPromptTarget(match[1] ?? ""));

    if (target && normalizedDocumentText.includes(target)) {
      return true;
    }
  }

  return false;
}

function hasExactEnglishTargetInDocument(lowerPrompt: string, normalizedDocumentText: string) {
  const patterns = [
    /\b(?:replace|change|update|rename)\s+["'`]?([^"'`\n]{1,48})["'`]?\s+(?:with|to)\s+["'`]?([^"'`\n]{1,80})["'`]?/i,
    /\b(?:delete|remove)\s+["'`]?([^"'`\n]{1,48})["'`]?/i,
  ];

  for (const pattern of patterns) {
    const match = lowerPrompt.match(pattern);
    if (!match) {
      continue;
    }

    const target = normalizeSearchText(cleanPromptTarget(match[1] ?? ""));

    if (target && normalizedDocumentText.includes(target)) {
      return true;
    }
  }

  return false;
}

function cleanPromptTarget(value: string) {
  return value
    .trim()
    .replace(/^[“"'`\s]+|[”"'`\s]+$/g, "")
    .replace(/^(?:文档里|文中|正文里|页面里|任务里|任务中的|列表里|表格里|行程表里|链接里|链接文本|删除线里的|粗体里的|斜体里的|美食里|景点里)/, "")
    .replace(/(?:这一行|这行|这一段|这段|这个任务|这个标题|这个词|这个字)$/g, "")
    .trim();
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function hasTableBlock(blocks?: AiChatDocumentBlock[]) {
  return (blocks ?? []).some((block) => block.type === "table");
}

function hasTaskListBlock(blocks?: AiChatDocumentBlock[]) {
  return (blocks ?? []).some((block) => block.type === "taskList");
}

function hasLinkBlock(blocks?: AiChatDocumentBlock[]) {
  return (blocks ?? []).some((block) => (block.html ?? "").includes("<a "));
}
