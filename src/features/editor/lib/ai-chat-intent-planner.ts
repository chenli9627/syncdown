import type {
  AiChatDocumentAction,
  AiChatDocumentBlock,
  AiChatResponseMode,
} from "@/features/app-state/types";
import { inferAiChatDocumentAction } from "@/features/editor/lib/ai-chat-action-inference";
import {
  type AiChatClarification,
  inferAiChatClarification,
} from "@/features/editor/lib/ai-chat-intent-clarification";
import { inferAiChatResponseMode } from "@/features/editor/lib/ai-chat-response-mode-inference";

type PlanAiChatIntentOptions = {
  documentBlocks?: AiChatDocumentBlock[];
  documentText?: string;
  hasRecentAssistantAnswer?: boolean;
  hasRecentDocumentAction?: boolean;
  hasSelection?: boolean;
};

export type AiChatIntentPlan =
  | {
      documentAction: null;
      kind: "chat";
      responseMode: AiChatResponseMode | null;
    }
  | {
      clarification: AiChatClarification;
      kind: "clarify";
    }
  | {
      documentAction: AiChatDocumentAction;
      kind: "edit";
      responseMode: AiChatResponseMode | null;
    }
  | {
      kind: "unsupported";
      reason: "manual_undo" | "whole_document_rewrite";
    };

export function planAiChatIntent(
  prompt: string,
  options: PlanAiChatIntentOptions = {},
): AiChatIntentPlan {
  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");
  const lowerPrompt = prompt.toLowerCase();
  const documentAction = inferAiChatDocumentAction(prompt, {
    documentBlocks: options.documentBlocks,
    documentText: options.documentText,
    hasRecentDocumentAction: options.hasRecentDocumentAction,
    hasSelection: options.hasSelection,
  });
  const responseMode = inferAiChatResponseMode(prompt);

  if (
    isExplicitNoDocumentChatPrompt(compactPrompt, lowerPrompt) ||
    isAnswerFormattingOnlyPrompt(compactPrompt, lowerPrompt)
  ) {
    return {
      documentAction: null,
      kind: "chat",
      responseMode,
    };
  }

  if (isManualUndoPrompt(compactPrompt, lowerPrompt)) {
    return {
      kind: "unsupported",
      reason: "manual_undo",
    };
  }

  if (
    isWholeDocumentRewritePrompt(compactPrompt, lowerPrompt) &&
    !isWholeDocumentStructuredEditPrompt(compactPrompt, lowerPrompt) &&
    !isDocumentAppendPrompt(compactPrompt, lowerPrompt) &&
    !options.hasSelection
  ) {
    return {
      kind: "unsupported",
      reason: "whole_document_rewrite",
    };
  }

  const clarification = inferAiChatClarification(prompt, {
    hasRecentAssistantAnswer: options.hasRecentAssistantAnswer,
    hasRecentDocumentAction: options.hasRecentDocumentAction,
    hasSelection: options.hasSelection,
  });

  if (clarification) {
    return {
      clarification,
      kind: "clarify",
    };
  }

  if (documentAction === "edit_blocks") {
    return {
      documentAction,
      kind: "edit",
      responseMode,
    };
  }

  if (looksLikeDocumentEditIntent(compactPrompt, lowerPrompt)) {
    return {
      clarification: {
        kind: "ambiguous_edit_intent",
        originalPrompt: prompt,
      },
      kind: "clarify",
    };
  }

  return {
    documentAction: null,
    kind: "chat",
    responseMode,
  };
}

function isExplicitNoDocumentChatPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:不要|别|仅|只|只是).{0,24}(?:修改|改动|更改|编辑|操作|插入|添加|删除|替换|写回).{0,16}(?:文档|正文|内容|页面|当前文档)/.test(
      compactPrompt,
    ) ||
    /(?:不修改|不改动|不更改|不编辑|不操作|不写回).{0,16}(?:文档|正文|内容|页面|当前文档)/.test(
      compactPrompt,
    ) ||
    /\b(?:do not|don't|dont|without|only)\b[\s\S]{0,120}\b(?:modify|change|edit|update|insert|add|delete|replace|write back)\b[\s\S]{0,80}\b(?:document|doc|page|content|text)\b/.test(
      lowerPrompt,
    )
  );
}

function isAnswerFormattingOnlyPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    !/(?:文档|正文|页面|末尾|开头|光标|插入|添加到|放到|写入|替换|删掉|删除|改成|改为|变成)/.test(
      compactPrompt,
    ) &&
    /(?:请用|用).{0,20}(?:markdown)?(?:表格|列表|要点|清单)(?:回答|输出|展示|返回)/.test(
      compactPrompt,
    )
  ) ||
    (!/\b(?:document|doc|page|cursor|insert|append|add to|write to|replace|delete|remove|change)\b/.test(
      lowerPrompt,
    ) &&
      /\b(?:answer|respond|return|show|output)\b[\s\S]{0,40}\b(?:markdown\s+)?(?:table|list|bullet\s+list|key\s+points?)\b/.test(
        lowerPrompt,
      ));
}

function isManualUndoPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:撤回|撤销|回退|还原|恢复).{0,24}(?:上一个|上次|刚才|最近一次).{0,24}(?:操作|修改|改动|编辑)/.test(
      compactPrompt,
    ) ||
    /\b(?:undo|revert|roll back|rollback|restore)\b[\s\S]{0,80}\b(?:last|previous|recent)\b[\s\S]{0,80}\b(?:change|edit|operation)\b/.test(
      lowerPrompt,
    )
  );
}

function isWholeDocumentRewritePrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:重写|改写|润色|优化|翻译|整理成|转换成|转成|格式化|重排|改成|改为|变成).{0,24}(?:文档|正文|全文|文章|页面|这篇|当前文档)/.test(
      compactPrompt,
    ) ||
    /(?:文档|正文|全文|文章|页面|这篇|当前文档).{0,24}(?:重写|改写|润色|优化|翻译|整理成|转换成|转成|格式化|重排|改成|改为|变成)/.test(
      compactPrompt,
    ) ||
    /\b(?:rewrite|revise|improve|translate|format|reformat|clean|convert|turn|update)\b[\s\S]{0,120}\b(?:document|doc|page|article)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:document|doc|page|article)\b[\s\S]{0,120}\b(?:rewrite|revise|improve|translate|format|reformat|clean|convert|turn|update)\b/.test(
      lowerPrompt,
    )
  );
}

function isDocumentAppendPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:放到|放入|放进|放在|写入|插入到|插入进|插入|添加到|添加在|添加|加入到|加入|加到|追加到|追加).{0,12}(?:文档)?(?:文末|末尾|最后|结尾|底部)/.test(
      compactPrompt,
    ) ||
    /(?:文档)?(?:文末|末尾|最后|结尾|底部).{0,12}(?:放|写入|插入|添加|加入|加|追加)/.test(
      compactPrompt,
    ) ||
    /\b(?:append|insert|add|place)\b[\s\S]{0,120}\b(?:end|bottom)\b[\s\S]{0,60}\b(?:document|doc|page)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:append|insert|add|place)\b[\s\S]{0,120}\b(?:document|doc|page)\b[\s\S]{0,60}\b(?:end|bottom)\b/.test(
      lowerPrompt,
    )
  );
}

function isWholeDocumentStructuredEditPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:文档|正文|全文|文章|页面|当前文档).{0,32}(?:标题|heading|h[1-6]|一级标题|二级标题|三级标题|四级标题|五级标题|六级标题|列表|任务列表|表格|单元格|链接|粗体|斜体|删除线|代码块|格式|层级|级别|等级)/.test(
      compactPrompt,
    ) ||
    /(?:标题|heading|h[1-6]|一级标题|二级标题|三级标题|四级标题|五级标题|六级标题|列表|任务列表|表格|单元格|链接|粗体|斜体|删除线|代码块|格式|层级|级别|等级).{0,32}(?:文档|正文|全文|文章|页面|当前文档)/.test(
      compactPrompt,
    ) ||
    /\b(?:document|doc|page|article)\b[\s\S]{0,120}\b(?:heading|headings|h[1-6]|title|titles|list|lists|task list|table|tables|cell|cells|link|links|bold|italic|strikethrough|code block|format|formats|structure|level)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:heading|headings|h[1-6]|title|titles|list|lists|task list|table|tables|cell|cells|link|links|bold|italic|strikethrough|code block|format|formats|structure|level)\b[\s\S]{0,120}\b(?:document|doc|page|article)\b/.test(
      lowerPrompt,
    )
  );
}

function looksLikeDocumentEditIntent(compactPrompt: string, lowerPrompt: string) {
  return (
    /^(?:帮我|请|麻烦你|把|将)?(?:改|修改|调整|优化|整理|重写|删掉|删除|去掉|替换|添加|加上|插入|移动|合并|拆分).{0,24}(?:一下|一下下|下|这个|这个东西|这段|这部分|结构|格式|内容|文档|正文|标题|段落|表格|列表|这里)$/.test(
      compactPrompt,
    ) ||
    /^(?:帮我|请|麻烦你|把|将)?(?:这个|这个东西|这段|这部分|结构|格式|内容|文档|正文|标题|段落|表格|列表|这里).{0,24}(?:改|修改|调整|优化|整理|重写|删掉|删除|去掉|替换|添加|加上|插入|移动|合并|拆分)(?:一下|一下下|下)?$/.test(
      compactPrompt,
    ) ||
    /^(?:帮我|请|麻烦你)?(?:调整|优化|整理).{0,24}(?:结构|格式|内容|文档|正文|标题|段落|表格|列表)$/.test(
      compactPrompt,
    ) ||
    /(?:修改|改写|改成|改为|变成|调整|优化|整理|重排|格式化|清理|修复|纠错|删除|移除|精简|缩写|扩写|转换|统一|替换|添加|新增|插入|加入|加上|移动|挪动|复制|合并|拆分).{0,36}(?:文档|正文|内容|全文|文章|页面|这篇|当前文档|段落|标题|小节|章节|部分|表格|列表|任务|单元格|块|选区|选中|光标|这里|末尾)/.test(
      compactPrompt,
    ) ||
    /(?:文档|正文|内容|全文|文章|页面|这篇|当前文档|段落|标题|小节|章节|部分|表格|列表|任务|单元格|块|选区|选中|光标|这里|末尾).{0,36}(?:修改|改写|改成|改为|变成|调整|优化|整理|重排|格式化|清理|修复|纠错|删除|移除|精简|缩写|扩写|转换|统一|替换|添加|新增|插入|加入|加上|移动|挪动|复制|合并|拆分)/.test(
      compactPrompt,
    ) ||
    /\b(?:edit|change|rewrite|revise|improve|translate|format|reformat|clean|fix|delete|remove|shorten|expand|convert|turn|update|replace|add|insert|append|move|merge|split)\b[\s\S]{0,120}\b(?:document|doc|page|article|content|text|paragraph|heading|section|table|list|task|cell|block|selection|cursor|end)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:document|doc|page|article|content|text|paragraph|heading|section|table|list|task|cell|block|selection|cursor|end)\b[\s\S]{0,120}\b(?:edit|change|rewrite|revise|improve|translate|format|reformat|clean|fix|delete|remove|shorten|expand|convert|turn|update|replace|add|insert|append|move|merge|split)\b/.test(
      lowerPrompt,
    ) ||
    /^(?:please\s+|help me\s+)?(?:edit|change|update|adjust|improve|rework|rewrite|delete|remove|replace|add|insert|move|merge|split)\b[\s\S]{0,60}\b(?:this|that|it|the structure|the format|the content)\b$/.test(
      lowerPrompt,
    )
  );
}
