import type { AiChatClarificationKind } from "@/features/editor/lib/ai-chat-intent-clarification";

export function getAiChatClarificationReply(
  kind: AiChatClarificationKind,
  prompt: string,
) {
  const english = prefersEnglish(prompt);

  if (kind === "ambiguous_edit_intent") {
    return english
      ? "This sounds like a document edit, but I am not sure what you want changed yet. Please name the target, the intended result, and whether it should be written back to the document."
      : "我看起来像是在帮你修改文档，但还不确定具体要怎么改。请说明要改哪一部分、改成什么，以及是否要写回文档。";
  }

  if (kind === "missing_insert_source") {
    return english
      ? "I am not sure what content to put into the document. Please name the source and whether it should go at the end, cursor, or under a heading."
      : "我不确定要把哪段内容放进文档。请说明来源内容，以及要放到末尾、光标处，还是某个标题下面。";
  }

  return english
    ? "I am not sure which part of the document to edit. Please name the target text, current cursor block, selection, or a specific heading or paragraph."
    : "我不确定你要修改文档里的哪一处。请说明目标文字、当前光标所在块、选区，或具体标题/段落。";
}

export function getAiChatUnsupportedReply(
  reason: "manual_undo" | "whole_document_rewrite",
  prompt: string,
) {
  const english = prefersEnglish(prompt);

  if (reason === "manual_undo") {
    return english
      ? "I will not undo the last edit for you. Please use Ctrl+Z or the editor's Undo button."
      : "我不会替你撤回上一次修改。请使用 Ctrl+Z 或编辑器里的撤销按钮。";
  }

  return english
    ? "I cannot rewrite the whole document directly yet. Please name a paragraph, section, table, list, selection, or insertion point."
    : "我还不能直接重写整篇文档。请指定一个段落、小节、表格、列表、选区或插入位置。";
}

function prefersEnglish(prompt: string) {
  return /[a-z]/i.test(prompt) && !/[\u4e00-\u9fff]/.test(prompt);
}
