import type { Editor } from "@tiptap/react";
import type {
  AiChatDocumentAction,
  AiChatMessage,
} from "@/features/app-state/types";
import { toAiInlineInsertHtml, toAiInsertHtml } from "@/features/editor/lib/ai";

type InferAiChatDocumentActionOptions = {
  hasSelection?: boolean;
};

export function inferAiChatDocumentAction(
  prompt: string,
  options: InferAiChatDocumentActionOptions = {},
): AiChatDocumentAction | null {
  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");
  const lowerPrompt = prompt.toLowerCase();

  if (isInsertEndPrompt(compactPrompt, lowerPrompt)) {
    return "insert_end";
  }

  if (isInsertCursorPrompt(compactPrompt, lowerPrompt)) {
    return "insert_cursor";
  }

  if (isSpecificPlacementPrompt(compactPrompt, lowerPrompt)) {
    return "edit_blocks";
  }

  if (
    isReplaceSelectionPrompt(compactPrompt, lowerPrompt) ||
    (options.hasSelection &&
      (isDocumentEditPrompt(compactPrompt, lowerPrompt) ||
        isStandaloneEditPrompt(compactPrompt, lowerPrompt)))
  ) {
    return "replace_selection";
  }

  if (isDocumentEditPrompt(compactPrompt, lowerPrompt)) {
    return "replace_document";
  }

  return null;
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

function isStandaloneEditPrompt(compactPrompt: string, lowerPrompt: string) {
  return (
    /(?:修改|改写|改得|改成|变成|重写|润色|优化|翻译|整理|重排|格式化|清理|修复|纠错|删除|移除|精简|缩写|扩写|转换|统一|替换)/.test(
      compactPrompt,
    ) ||
    /\b(?:edit|change|rewrite|revise|improve|translate|format|reformat|clean|fix|delete|remove|shorten|expand|convert|turn|update|replace)\b/.test(
      lowerPrompt,
    )
  );
}

export function getAiChatMessageText(message: AiChatMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

export function replaceSelectionWithAiResponse(
  editor: Editor | null,
  message: AiChatMessage,
  text: string,
) {
  if (!editor) {
    return;
  }

  const currentSelection = editor.state.selection;

  if (!currentSelection.empty) {
    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: currentSelection.from, to: currentSelection.to },
        getAiInsertContentForRange(editor, currentSelection.from, currentSelection.to, text),
      )
      .run();
    return;
  }

  const originalSelection = message.metadata?.selection;

  if (originalSelection) {
    const from = Math.max(0, Math.min(originalSelection.from, editor.state.doc.content.size));
    const to = Math.max(from, Math.min(originalSelection.to, editor.state.doc.content.size));

    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, getAiInsertContentForRange(editor, from, to, text))
      .run();
  }
}

export function insertAiResponseAtCursor(editor: Editor | null, text: string) {
  if (!editor) {
    return;
  }

  const { from, to } = editor.state.selection;

  editor
    .chain()
    .focus()
    .insertContent(getAiInsertContentForRange(editor, from, to, text))
    .run();
}

export function insertAiResponseAtEnd(editor: Editor | null, text: string) {
  if (!editor) {
    return;
  }

  const inlineContent = toAiInlineInsertHtml(text);
  const lastTextblockEnd = getLastTextblockEndPosition(editor);

  if (lastTextblockEnd != null && !isBlockInsertContent(inlineContent)) {
    editor
      .chain()
      .focus()
      .insertContentAt(lastTextblockEnd, inlineContent)
      .run();
    return;
  }

  editor
    .chain()
    .focus()
    .insertContentAt(editor.state.doc.content.size, toAiInsertHtml(text))
    .run();
}

export function appendAiResponseAsDocumentEndBlocks(editor: Editor | null, text: string) {
  if (!editor) {
    return;
  }

  editor
    .chain()
    .focus()
    .insertContentAt(editor.state.doc.content.size, toAiInsertHtml(text))
    .run();
}

export function replaceDocumentWithAiResponse(editor: Editor | null, text: string) {
  if (!editor) {
    return;
  }

  editor.commands.setContent(toAiInsertHtml(text));
  editor.commands.focus("end");
}

function getAiInsertContentForRange(
  editor: Editor,
  from: number,
  to: number,
  text: string,
) {
  return canInsertInlineAtRange(editor, from, to)
    ? toAiInlineInsertHtml(text)
    : toAiInsertHtml(text);
}

function canInsertInlineAtRange(editor: Editor, from: number, to: number) {
  const docSize = editor.state.doc.content.size;
  const safeFrom = Math.max(0, Math.min(from, docSize));
  const safeTo = Math.max(safeFrom, Math.min(to, docSize));
  const $from = editor.state.doc.resolve(safeFrom);
  const $to = editor.state.doc.resolve(safeTo);

  return $from.parent.isTextblock && $from.sameParent($to);
}

function getLastTextblockEndPosition(editor: Editor) {
  let endPosition: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.isTextblock) {
      endPosition = pos + node.nodeSize - 1;
    }
  });

  return endPosition;
}

function isBlockInsertContent(content: string) {
  return /^<(?:blockquote|h[1-6]|hr|img|ol|p|pre|table|ul)(?:\s|>)/i.test(content.trim());
}
