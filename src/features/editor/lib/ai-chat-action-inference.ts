import type {
  AiChatDocumentAction,
  AiChatDocumentBlock,
} from "@/features/app-state/types";
import { matchesCurrentDocumentMutationContext } from "@/features/editor/lib/ai-chat-document-action-context";

type InferAiChatDocumentActionOptions = {
  documentBlocks?: AiChatDocumentBlock[];
  documentText?: string;
  hasSelection?: boolean;
  hasRecentDocumentAction?: boolean;
};

export function inferAiChatDocumentAction(
  prompt: string,
  options: InferAiChatDocumentActionOptions = {},
): AiChatDocumentAction | null {
  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");
  const lowerPrompt = prompt.toLowerCase();

  if (isManualUndoPrompt(compactPrompt, lowerPrompt)) {
    return null;
  }

  if (isNoDocumentEditPrompt(compactPrompt, lowerPrompt)) {
    return null;
  }

  if (!options.hasSelection && isReplaceSelectionPrompt(compactPrompt, lowerPrompt)) {
    return null;
  }

  if (isInsertEndPrompt(compactPrompt, lowerPrompt)) {
    return "edit_blocks";
  }

  if (isInsertCursorPrompt(compactPrompt, lowerPrompt)) {
    return "edit_blocks";
  }

  if (
    options.hasRecentDocumentAction &&
    isDocumentEditFollowUpPrompt(compactPrompt, lowerPrompt)
  ) {
    return "edit_blocks";
  }

  if (isPreviousAssistantContentInsertPrompt(compactPrompt, lowerPrompt)) {
    return "edit_blocks";
  }

  if (isErrorCorrectionDocumentEditPrompt(compactPrompt, lowerPrompt)) {
    return "edit_blocks";
  }

  if (
    isHeadingLevelEditPrompt(compactPrompt, lowerPrompt) ||
    isSpecialFormatEditPrompt(compactPrompt, lowerPrompt) ||
    isDocumentStructureEditPrompt(compactPrompt, lowerPrompt) ||
    isSectionHeadingEditPrompt(compactPrompt, lowerPrompt) ||
    isSpecificPlacementPrompt(compactPrompt, lowerPrompt) ||
    isTargetedBlockEditPrompt(compactPrompt, lowerPrompt) ||
    isImplicitDocumentMutationPrompt(compactPrompt, lowerPrompt) ||
    matchesCurrentDocumentMutationContext(prompt, {
      documentBlocks: options.documentBlocks,
      documentText: options.documentText,
    })
  ) {
    return "edit_blocks";
  }

  if (
    options.hasSelection &&
    isReplaceSelectionPrompt(compactPrompt, lowerPrompt)
  ) {
    return "edit_blocks";
  }

  if (
    isDocumentEditPrompt(compactPrompt, lowerPrompt) &&
    !isWholeDocumentReplacementPrompt(compactPrompt, lowerPrompt)
  ) {
    return "edit_blocks";
  }

  if (isWholeDocumentReplacementPrompt(compactPrompt, lowerPrompt)) {
    return "edit_blocks";
  }

  return null;
}

function isNoDocumentEditPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:不要|别|无需|不需要|不能|不要再|只回答|仅回答).{0,24}(?:修改|改动|更改|编辑|操作|插入|添加|删除|替换).{0,12}(?:文档|正文|内容|页面|当前文档)/.test(
      compactPrompt,
    ) ||
    /(?:不修改|不改动|不更改|不编辑|不操作).{0,12}(?:文档|正文|内容|页面|当前文档)/.test(
      compactPrompt,
    ) ||
    /\b(?:do not|don't|dont|without|no need to|only answer|just answer)\b[\s\S]{0,120}\b(?:modify|change|edit|update|insert|add|delete|replace)\b[\s\S]{0,80}\b(?:document|doc|page|content|text)\b/.test(
      lowerPrompt,
    )
  );
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

function isInsertEndPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:放到|放入|放进|放在|写入|插入到|插入进|添加到|添加在|加入到|加到|追加到).{0,12}(?:文档)?(?:末尾|最后|结尾|底部)/.test(
      compactPrompt,
    ) ||
    /(?:文档)?(?:末尾|最后|结尾|底部).{0,12}(?:放|写入|插入|添加|加入|加|追加)/.test(
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

function isInsertCursorPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:插入到|放到|添加到|加到).{0,12}(?:光标|当前位置|当前块|这里|此处)/.test(
      compactPrompt,
    ) ||
    /(?:光标|当前位置|当前块|这里|此处).{0,12}(?:插入|放|添加|加)/.test(
      compactPrompt,
    ) ||
    /\b(?:insert|add|place)\b[\s\S]{0,120}\b(?:cursor|current position|here)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:cursor|current position|here)\b[\s\S]{0,120}\b(?:insert|add|place)\b/.test(
      lowerPrompt,
    )
  );
}

function isReplaceSelectionPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:替换|改写|修改|润色|优化|重写|翻译|总结|扩写|缩写|精简).{0,16}(?:选中|选区|所选|这段|当前选中)/.test(
      compactPrompt,
    ) ||
    /(?:选中|选区|所选|这段|当前选中).{0,16}(?:替换|改写|修改|润色|优化|重写|翻译|总结|扩写|缩写|精简|改成|变成)/.test(
      compactPrompt,
    ) ||
    /\b(?:replace|rewrite|revise|edit|improve|translate|summarize|expand|shorten)\b[\s\S]{0,120}\b(?:selection|selected text|selected content|highlighted text)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:selection|selected text|selected content|highlighted text)\b[\s\S]{0,120}\b(?:replace|rewrite|revise|edit|improve|translate|summarize|expand|shorten)\b/.test(
      lowerPrompt,
    )
  );
}

function isDocumentEditFollowUpPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /^(?:不对|错了|有问题|没成功|没生效|没有修改|没改|不成功|失败了|还是不行).{0,80}(?:修复|修正|改|修改|调整|重做|重新|再试|执行|应用|生效)/.test(
      compactPrompt,
    ) ||
    /(?:修复|修正|改|修改|调整|重做|重新|再试|执行|应用|生效).{0,80}(?:一下|它|这个|这次|刚才|上次|前面|错误|问题|方案|修改|操作|文档|内容)/.test(
      compactPrompt,
    ) ||
    /(?:按|照着|根据).{0,40}(?:这个|这条|上面|刚才|你说的|方案|建议).{0,40}(?:改|修改|修复|执行|应用|处理)/.test(
      compactPrompt,
    ) ||
    /\b(?:fix|correct|repair|redo|retry|try again|apply|run|execute|make)\b[\s\S]{0,160}\b(?:it|that|this|the change|the edit|the fix|your suggestion|document|content)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:that|this|it|the change|the edit|the fix|your suggestion)\b[\s\S]{0,160}\b(?:fix|correct|repair|redo|retry|try again|apply|run|execute|make)\b/.test(
      lowerPrompt,
    )
  );
}

function isPreviousAssistantContentInsertPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:刚才|上面|前面|之前|你推荐的|你列的|你给的|这个|这些|该|那个|那张|这些).{0,48}(?:表格|列表|清单|说明|回答|结果|内容|景点|推荐).{0,48}(?:添加|加入|插入|写入|放到|放入|放进|放在|加到).{0,24}(?:文档|正文|文章|页面)/.test(
      compactPrompt,
    ) ||
    /(?:添加|加入|插入|写入|放到|放入|放进|放在|加到).{0,48}(?:刚才|上面|前面|之前|你推荐的|你列的|你给的|这个|这些|该|那个|那张|这些).{0,48}(?:表格|列表|清单|说明|回答|结果|内容|景点|推荐).{0,24}(?:文档|正文|文章|页面)/.test(
      compactPrompt,
    ) ||
    /(?:表格|列表|清单|说明|回答|结果|内容|景点|推荐).{0,48}(?:添加|加入|插入|写入|放到|放入|放进|放在|加到).{0,24}(?:文档|正文|文章|页面)/.test(
      compactPrompt,
    ) ||
    /\b(?:add|insert|append|put|place)\b[\s\S]{0,160}\b(?:previous|above|earlier|last|this|that|these|the)\b[\s\S]{0,120}\b(?:table|list|answer|response|content|result|recommendations?)\b[\s\S]{0,80}\b(?:document|doc|page)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:previous|above|earlier|last|this|that|these|the)\b[\s\S]{0,120}\b(?:table|list|answer|response|content|result|recommendations?)\b[\s\S]{0,160}\b(?:add|insert|append|put|place)\b[\s\S]{0,80}\b(?:document|doc|page)\b/.test(
      lowerPrompt,
    )
  );
}

function isErrorCorrectionDocumentEditPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:修改|修复|修正|纠正|改正|处理|解决|调整|改掉|删掉|去掉).{0,48}(?:错误|错处|错别字|病句|问题|bug|异常|不对的地方|不正确的地方)/i.test(
      compactPrompt,
    ) ||
    /(?:错误|错处|错别字|病句|问题|bug|异常|不对的地方|不正确的地方).{0,48}(?:修改|修复|修正|纠正|改正|处理|解决|调整|改掉|删掉|去掉)/i.test(
      compactPrompt,
    ) ||
    /(?:把|将).{0,48}(?:错误|错处|错别字|病句|问题|bug|异常|不对的地方|不正确的地方).{0,48}(?:改|修改|修复|修正|纠正|改正|处理|解决|调整|改掉|删掉|去掉)/i.test(
      compactPrompt,
    ) ||
    /\b(?:fix|correct|repair|resolve|address|update|change|remove)\b[\s\S]{0,160}\b(?:error|errors|mistake|mistakes|typo|typos|bug|bugs|issue|issues|wrong|incorrect)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:error|errors|mistake|mistakes|typo|typos|bug|bugs|issue|issues|wrong|incorrect)\b[\s\S]{0,160}\b(?:fix|correct|repair|resolve|address|update|change|remove)\b/.test(
      lowerPrompt,
    )
  );
}

function isSpecificPlacementPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    hasChinesePlacementVerb(compactPrompt) &&
      /(?:开头|顶部|前面|后面|之前|之后|上面|下面|上方|下方|中间|之间|标题|段落|第[一二三四五六七八九十\d]+段|小节|章节|部分|表格|列表|清单|摘要|背景|引言|目标|方案|风险|结论)/.test(
        compactPrompt,
      )
  ) ||
    (/\b(?:add|insert|place|put|move|append|write|create|generate)\b/.test(lowerPrompt) &&
      /\b(?:before|after|under|below|above|over|between|near|beginning|top|heading|section|paragraph|table|list|summary|background|introduction|goal|plan|risk|conclusion)\b/.test(
        lowerPrompt,
      ))
}

function isTargetedBlockEditPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:删除|移除|删掉|去掉|替换|修改|调整|设置|改写|改成|改为|变成|更新).{0,48}(?:包含|含有|这段|这一段|该段|段落|表格|块|小节|章节|部分|第[一二三四五六七八九十\d]+段|背景|方案|风险|结论|摘要|列表|列表项|列表项目|粗体|斜体|删除线|链接|代码块|引用|一级标题|二级标题|三级标题|四级标题|五级标题|六级标题|h[1-6])/i.test(
      compactPrompt,
    ) ||
    /(?:包含|含有|这段|这一段|该段|段落|表格|块|小节|章节|部分|第[一二三四五六七八九十\d]+段|背景|方案|风险|结论|摘要|列表|列表项|列表项目|粗体|斜体|删除线|链接|代码块|引用|一级标题|二级标题|三级标题|四级标题|五级标题|六级标题|h[1-6]).{0,48}(?:删除|移除|删掉|去掉|替换|修改|调整|设置|改写|改成|改为|变成|更新)/i.test(
      compactPrompt,
    ) ||
    /(?:删除|移除|删掉|去掉|替换|修改|调整|设置|改写|改成|改为|变成|更新).{0,48}(?:原文|已有|现有|原有|当前|这个|这张|该).{0,24}(?:段落|表格|列表|清单|小节|章节|标题|部分)/.test(
      compactPrompt,
    ) ||
    /(?:原文|已有|现有|原有|当前|这个|这张|该).{0,24}(?:段落|表格|列表|清单|小节|章节|标题|部分).{0,48}(?:删除|移除|删掉|去掉|替换|修改|调整|设置|改写|改成|改为|变成|更新)/.test(
      compactPrompt,
    ) ||
    /(?:删除|移除|删掉|去掉|修改|更新|替换).{0,48}(?:表格?|表|第[一二三四五六七八九十\d]+行|第[一二三四五六七八九十\d]+列|最后一行|末尾一行|所在的行|这一行|这行|单元格)/i.test(
      compactPrompt,
    ) ||
    /(?:表格?|表|第[一二三四五六七八九十\d]+行|第[一二三四五六七八九十\d]+列|最后一行|末尾一行|所在的行|这一行|这行|单元格).{0,48}(?:删除|移除|删掉|去掉|修改|更新|替换)/i.test(
      compactPrompt,
    ) ||
    /\b(?:delete|remove|replace|change|update|edit|rewrite)\b[\s\S]{0,160}\b(?:containing|contains|paragraph|table|block|heading|section|part|background|plan|risk|conclusion|summary)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:containing|contains|paragraph|table|block|heading|section|part|background|plan|risk|conclusion|summary)\b[\s\S]{0,160}\b(?:delete|remove|replace|change|update|edit|rewrite)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:delete|remove|replace|change|update|edit|rewrite)\b[\s\S]{0,160}\b(?:original|existing|current|this|that)\b[\s\S]{0,80}\b(?:paragraph|table|block|heading|section|list)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:original|existing|current|this|that)\b[\s\S]{0,80}\b(?:paragraph|table|block|heading|section|list)\b[\s\S]{0,160}\b(?:delete|remove|replace|change|update|edit|rewrite)\b/.test(
      lowerPrompt,
    )
  );
}

function isImplicitDocumentMutationPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /^(?:删除|移除|删掉|去掉|清除|替换|修改|调整|更新).{0,80}(?:这个|这个东西|这部分|这些|那个|那些|它|其中|重复|引用标注|引用|脚注|参考文献|最后一段|第[一二三四五六七八九十\d]+段|段落|表格|列表|清单|任务项|小节|章节|部分|内容|文字|句子)/.test(
      compactPrompt,
    ) ||
    /(?:这个|这个东西|这部分|这些|那个|那些|它|其中|重复|引用标注|引用|脚注|参考文献|最后一段|第[一二三四五六七八九十\d]+段|段落|表格|列表|清单|任务项|小节|章节|部分|内容|文字|句子).{0,80}(?:删除|移除|删掉|去掉|清除|替换|修改|调整|更新)/.test(
      compactPrompt,
    ) ||
    /\b(?:delete|remove|clear|replace|change|update|edit)\b[\s\S]{0,160}\b(?:this|that|it|duplicate|duplicates|citation|citations|reference|references|footnote|footnotes|last paragraph|paragraph|table|list|task item|section|part|content|text|sentence)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:this|that|it|duplicate|duplicates|citation|citations|reference|references|footnote|footnotes|last paragraph|paragraph|table|list|task item|section|part|content|text|sentence)\b[\s\S]{0,160}\b(?:delete|remove|clear|replace|change|update|edit)\b/.test(
      lowerPrompt,
    )
  );
}

function isHeadingLevelEditPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:修改|调整|设置|改成|改为|变成|更新|升为|降为).{0,48}(?:标题|h[1-6]).{0,48}(?:层级|级别|等级|一级标题|二级标题|三级标题|四级标题|五级标题|六级标题|h[1-6])/.test(
      compactPrompt,
    ) ||
    /(?:标题|h[1-6]).{0,48}(?:层级|级别|等级|一级标题|二级标题|三级标题|四级标题|五级标题|六级标题|h[1-6]).{0,48}(?:修改|调整|设置|改成|改为|变成|更新|升为|降为)/.test(
      compactPrompt,
    ) ||
    /(?:层级|级别|等级|一级标题|二级标题|三级标题|四级标题|五级标题|六级标题|h[1-6]).{0,48}(?:标题|h[1-6]).{0,48}(?:修改|调整|设置|改成|改为|变成|更新|升为|降为)/.test(
      compactPrompt,
    ) ||
    /\b(?:change|update|set|make|turn)\b[\s\S]{0,120}\b(?:heading|h[1-6])\b[\s\S]{0,80}\b(?:level|h[1-6]|heading\s+[1-6])\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:heading|h[1-6])\b[\s\S]{0,80}\b(?:level|h[1-6]|heading\s+[1-6])\b[\s\S]{0,120}\b(?:change|update|set|make|turn)\b/.test(
      lowerPrompt,
    ) ||
    /(?:把|将)?(?:所有|全部)?标题(?:都)?(?:缩小|降级|降低|下调|放大|升级|升高|提高|上调)(?:一个)?等级/.test(
      compactPrompt,
    ) ||
    /\b(?:demote|decrease|lower|promote|increase|raise)\b[\s\S]{0,80}\b(?:all\s+)?headings?\b[\s\S]{0,40}\b(?:one\s+level|by\s+one)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:all\s+)?headings?\b[\s\S]{0,80}\b(?:demote|decrease|lower|promote|increase|raise)\b[\s\S]{0,40}\b(?:one\s+level|by\s+one)\b/.test(
      lowerPrompt,
    )
  );
}

function isSpecialFormatEditPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:把|将).{0,80}(?:都|全部|所有|设为|设置为|改成|改为|变成|加上|添加|取消|去掉|移除|清除)?.{0,24}(?:粗体|加粗|斜体|删除线|中划线|行内代码|代码格式|链接|超链接)/i.test(
      compactPrompt,
    ) ||
    /(?:加|添加|设为|设置|改成|改为|变成|修改|移除|删除|去掉|取消|清除|更新|替换).{0,64}(?:粗体|加粗|斜体|删除线|中划线|行内代码|代码格式|链接|超链接|url|网址|表格单元格|单元格|第[一二三四五六七八九十\d]+行|第[一二三四五六七八九十\d]+列|段落格式|代码块)/i.test(
      compactPrompt,
    ) ||
    /(?:粗体|加粗|斜体|删除线|中划线|行内代码|代码格式|链接|超链接|url|网址|表格单元格|单元格|第[一二三四五六七八九十\d]+行|第[一二三四五六七八九十\d]+列|段落格式|代码块).{0,64}(?:加|添加|设为|设置|改成|改为|变成|修改|移除|删除|去掉|取消|清除|更新|替换)/i.test(
      compactPrompt,
    ) ||
    /\b(?:add|set|make|turn|change|update|remove|clear|delete|replace)\b[\s\S]{0,160}\b(?:bold|italic|strikethrough|strike|inline code|code format|link|url|table cell|cell|row|column|paragraph|code block)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:bold|italic|strikethrough|strike|inline code|code format|link|url|table cell|cell|row|column|paragraph|code block)\b[\s\S]{0,160}\b(?:add|set|make|turn|change|update|remove|clear|delete|replace)\b/.test(
      lowerPrompt,
    )
  );
}

function isDocumentStructureEditPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:互换|交换|调换).{0,48}(?:位置|顺序)/.test(compactPrompt) ||
    /(?:位置|顺序).{0,48}(?:互换|交换|调换)/.test(compactPrompt) ||
    /(?:移动|挪动|复制|拷贝|移动到|挪到|复制到|替换所有|全部替换|批量替换|所有|全部|勾选|取消勾选|改成任务|转成任务|任务列表|有序列表|无序列表|项目符号|编号列表|新增行|插入行|删除行|新增列|插入列|删除列|表头|标题行).{0,64}(?:替换|改成|块|段落|标题|列表|任务|表格|行|列|单元格|文档|全文|内容)/.test(
      compactPrompt,
    ) ||
    /(?:替换|块|段落|标题|列表|任务|表格|行|列|单元格|文档|全文|内容).{0,64}(?:移动|挪动|复制|拷贝|移动到|挪到|复制到|替换所有|全部替换|批量替换|所有|全部|勾选|取消勾选|改成任务|转成任务|任务列表|有序列表|无序列表|项目符号|编号列表|新增行|插入行|删除行|新增列|插入列|删除列|表头|标题行)/.test(
      compactPrompt,
    ) ||
    /\b(?:move|copy|duplicate|replace all|replace every|check|uncheck|toggle|convert|turn|insert|add|delete|remove)\b[\s\S]{0,180}\b(?:block|paragraph|heading|list|task|table|row|column|header row|document|content)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:block|paragraph|heading|list|task|table|row|column|header row|document|content)\b[\s\S]{0,180}\b(?:move|copy|duplicate|replace all|replace every|check|uncheck|toggle|convert|turn|insert|add|delete|remove)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:swap|exchange|switch)\b[\s\S]{0,120}\b(?:position|order|places?)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:position|order|places?)\b[\s\S]{0,120}\b(?:swap|exchange|switch)\b/.test(
      lowerPrompt,
    )
  );
}

function isSectionHeadingEditPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:添加|新增|加入|加上|补充|生成|插入|加|补).{0,48}(?:小标题|子标题|章节标题|分段标题|段落标题|sectionheading|subheading)/i.test(
      compactPrompt,
    ) ||
    /(?:给|为|把).{0,16}(?:每个?|所有)?(?:段|段落).{0,32}(?:加|添加|新增|插入|补|弄).{0,24}(?:一级标题|二级标题|三级标题|四级标题|五级标题|六级标题|h[1-6]|heading|小标题|子标题)/i.test(
      compactPrompt,
    ) ||
    /(?:每个?|所有)?(?:段|段落).{0,32}(?:加|添加|新增|插入|补|弄).{0,24}(?:一级标题|二级标题|三级标题|四级标题|五级标题|六级标题|h[1-6]|heading|小标题|子标题)/i.test(
      compactPrompt,
    ) ||
    /(?:一级标题|二级标题|三级标题|四级标题|五级标题|六级标题|h[1-6]|heading|小标题|子标题).{0,24}(?:加|添加|新增|插入|补|弄).{0,32}(?:每个?|所有)?(?:段|段落)/i.test(
      compactPrompt,
    ) ||
    /(?:小标题|子标题|章节标题|分段标题|段落标题|sectionheading|subheading).{0,48}(?:添加|新增|加入|加上|补充|生成|插入|加|补)/i.test(
      compactPrompt,
    ) ||
    /\b(?:add|insert|create|generate)\b[\s\S]{0,160}\b(?:subheadings?|section headings?|paragraph headings?)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:add|insert|create|generate|make)\b[\s\S]{0,120}\b(?:h[1-6]|heading|subheadings?|section headings?)\b[\s\S]{0,120}\b(?:every|each|all)\b[\s\S]{0,40}\b(?:paragraph|paragraphs)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:every|each|all)\b[\s\S]{0,40}\b(?:paragraph|paragraphs)\b[\s\S]{0,120}\b(?:add|insert|create|generate|make)\b[\s\S]{0,120}\b(?:h[1-6]|heading|subheadings?|section headings?)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:subheadings?|section headings?|paragraph headings?)\b[\s\S]{0,160}\b(?:add|insert|create|generate)\b/.test(
      lowerPrompt,
    )
  );
}

function hasChinesePlacementVerb(compactPrompt: string) {
  return /(?:生成|写|创建|新增|添加|加入|插入|放到|放入|放进|放在|写入|移动|挪到|追加)/.test(
    compactPrompt,
  );
}

function isDocumentEditPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:修改|改写|改成|变成|重写|润色|优化|翻译|整理|重排|格式化|清理|修复|纠错|删除|移除|精简|缩写|扩写|转换|统一|替换).{0,24}(?:文档|正文|内容|全文|文章|页面|这篇|当前文档)/.test(
      compactPrompt,
    ) ||
    /(?:文档|正文|内容|全文|文章|页面|这篇|当前文档).{0,24}(?:修改|改写|改成|变成|重写|润色|优化|翻译|整理|重排|格式化|清理|修复|纠错|删除|移除|精简|缩写|扩写|转换|统一|替换)/.test(
      compactPrompt,
    ) ||
    /\b(?:edit|change|rewrite|revise|improve|translate|format|reformat|clean|fix|delete|remove|shorten|expand|convert|turn|update|replace)\b[\s\S]{0,120}\b(?:document|doc|page|article|content|text)\b/.test(
      lowerPrompt,
    ) ||
    /\b(?:document|doc|page|article|content|text)\b[\s\S]{0,120}\b(?:edit|change|rewrite|revise|improve|translate|format|reformat|clean|fix|delete|remove|shorten|expand|convert|turn|update|replace)\b/.test(
      lowerPrompt,
    )
  );
}

function isWholeDocumentReplacementPrompt(compactPrompt: string, lowerPrompt: string) {
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
