import { inferAiChatDocumentAction } from "@/features/editor/lib/ai-chat-action-inference";

type InferAiChatClarificationOptions = {
  hasRecentAssistantAnswer?: boolean;
  hasRecentDocumentAction?: boolean;
  hasSelection?: boolean;
};

export type AiChatClarificationKind =
  | "ambiguous_edit_intent"
  | "ambiguous_document_target"
  | "missing_insert_source";

export type AiChatClarification = {
  kind: AiChatClarificationKind;
  originalPrompt: string;
};

export function inferAiChatClarification(
  prompt: string,
  options: InferAiChatClarificationOptions = {},
): AiChatClarification | null {
  const action = inferAiChatDocumentAction(prompt, options);

  if (!action) {
    return null;
  }

  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");
  const lowerPrompt = prompt.toLowerCase();

  if (
    action === "edit_blocks" &&
    !options.hasSelection &&
    !options.hasRecentDocumentAction &&
    isAmbiguousDocumentTargetPrompt(compactPrompt, lowerPrompt)
  ) {
    return {
      kind: "ambiguous_document_target",
      originalPrompt: prompt,
    };
  }

  if (
    action === "edit_blocks" &&
    !options.hasSelection &&
    !options.hasRecentAssistantAnswer &&
    isMissingInsertSourcePrompt(compactPrompt, lowerPrompt)
  ) {
    return {
      kind: "missing_insert_source",
      originalPrompt: prompt,
    };
  }

  return null;
}

export function resolveAiChatClarifiedPrompt(
  clarification: AiChatClarification,
  reply: string,
) {
  return `${clarification.originalPrompt.trim()}\n\n用户补充：${reply.trim()}`;
}

export function isAiChatClarificationCancelPrompt(prompt: string) {
  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");

  return /^(?:取消|算了|不用了|不要了|先不|不用处理|停止|cancel|never mind|nevermind)$/.test(
    compactPrompt,
  );
}

function isAmbiguousDocumentTargetPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /^(?:删除|移除|删掉|去掉|清除|替换|修改|调整|更新|处理|改|修复).{0,24}(?:这个|这个东西|这部分|这些|那个|那些|它|这个内容|这段内容|这里|上面|刚才)$/.test(
      compactPrompt,
    ) ||
    /^(?:把|将)?(?:这个|这个东西|这部分|这些|那个|那些|它|这个内容|这段内容|这里|上面|刚才).{0,24}(?:删除|移除|删掉|去掉|清除|替换|修改|调整|更新|处理|改|修复)$/.test(
      compactPrompt,
    ) ||
    /\b(?:delete|remove|replace|change|update|edit|fix)\b[\s\S]{0,80}\b(?:this|that|it|these|those)\b$/.test(
      lowerPrompt,
    ) ||
    /^(?:this|that|it|these|those)\b[\s\S]{0,80}\b(?:delete|remove|replace|change|update|edit|fix)\b/.test(
      lowerPrompt,
    )
  );
}

function isMissingInsertSourcePrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    (hasDocumentInsertion(compactPrompt, lowerPrompt) &&
      (hasVagueSourceReference(compactPrompt, lowerPrompt) ||
        hasSourceTransformWithoutSource(compactPrompt, lowerPrompt)) &&
      !hasExplicitSource(compactPrompt, lowerPrompt)) ||
    /^(?:加进去|放进去|写进去|插入进去|添加进去|加入进去)$/.test(compactPrompt) ||
    /^(?:add|insert|put|place|append)\s+(?:it|this|that|these|those)$/i.test(
      lowerPrompt.trim(),
    )
  );
}

function hasDocumentInsertion(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:添加|加入|插入|写入|放到|放入|放进|放在|加到).{0,36}(?:文档|正文|文章|页面)/.test(
      compactPrompt,
    ) ||
    /\b(?:add|insert|append|put|place)\b[\s\S]{0,120}\b(?:document|doc|page)\b/.test(
      lowerPrompt,
    )
  );
}

function hasVagueSourceReference(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:这个|这些|那个|那些|它|表格|列表|清单|内容|结果|回答|推荐|说明).{0,36}(?:添加|加入|插入|写入|放到|放入|放进|放在|加到)/.test(
      compactPrompt,
    ) ||
    /(?:添加|加入|插入|写入|放到|放入|放进|放在|加到).{0,36}(?:这个|这些|那个|那些|它|表格|列表|清单|内容|结果|回答|推荐|说明)/.test(
      compactPrompt,
    ) ||
    /\b(?:this|that|it|these|those|table|list|content|answer|response|result|recommendations?)\b/.test(
      lowerPrompt,
    )
  );
}

function hasSourceTransformWithoutSource(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:整理|转成|转换成|做成|改成|变成).{0,16}(?:表格|列表|清单|段落|小标题|章节).{0,36}(?:文档|正文|文章|页面)/.test(
      compactPrompt,
    ) ||
    /\b(?:format|organize|convert|turn|make)\b[\s\S]{0,80}\b(?:table|list|section|paragraph)\b[\s\S]{0,120}\b(?:document|doc|page)\b/.test(
      lowerPrompt,
    )
  );
}

function hasExplicitSource(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:当前文档|这篇文档|文档里|原文|选中|选区|所选|光标|今天|今日|网页|网址|链接|https?:\/\/|微博|热搜|hackernews|新闻|搜索|查找|查询|生成|创建|给我|写一个|写一段|做一个|列一个|推荐|总结).{0,120}/i.test(
      compactPrompt,
    ) ||
    /(?:[^\s，。！？,.]{1,24}|北上广深|多个城市|多地|几个大城市|各大城市).{0,12}(?:天气|天气预报|气温)/u.test(
      compactPrompt,
    ) ||
    /\b(?:current document|selected|selection|cursor|today|web|url|https?:\/\/|hacker news|news|search|fetch|generate|create|write|make|recommend|summarize)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:weather|forecast|temperature)\b[\s\S]{0,80}\b(?:beijing|shanghai|guangzhou|shenzhen|tokyo|london|singapore|new york|cities|city)\b/i.test(
      lowerPrompt,
    )
  );
}
