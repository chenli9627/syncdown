import type {
  AiChatDocumentAction,
  AiChatDocumentBlock,
  AiChatSelection,
} from "@/features/app-state/types";

export function buildDocumentChatSystemPrompt(
  documentTitle: string,
  documentText: string,
  documentBlocks: AiChatDocumentBlock[],
  selection: AiChatSelection | null,
  modelName: string,
  documentAction: AiChatDocumentAction | null,
) {
  const cleanDocumentTitle = documentTitle.trim() || "(untitled document)";
  const cleanDocumentText = documentText.trim() || "(empty document)";
  const selectionText = selection?.text.trim();

  return [
    "You are Syncdown's document assistant.",
    `The currently selected AI model is exactly: ${modelName}.`,
    "If the user asks what model you are, answer with that exact model name and do not claim to be a different model.",
    "You can help the user discuss, rewrite, summarize, expand, translate, and structure the current document.",
    "You have a fetch_url tool for public HTTP(S) pages. Use it only when the user explicitly asks for web/current information or asks you to open/read a URL.",
    "The fetch_url tool returns long pages in chunks. If hasMore is true and the user needs the full page, call fetch_url again with start set to nextStart.",
    "Do not answer that a page is too long before you have fetched the available chunks needed for the user's request.",
    "Do not describe internal tool calls, request counts, offsets, chunk sizes, hasMore, nextStart, or total character counts in the final answer.",
    "After using tools, answer the user's actual question directly unless the user explicitly asks how the information was fetched.",
    "Do not use fetch_url for local, private-network, or non-HTTP(S) URLs. If a page cannot be fetched, explain the limitation briefly.",
    documentAction
      ? "The frontend will automatically apply your next answer to the current document."
      : "When the user asks for an edit, return content that can be inserted into the document directly.",
    documentAction
      ? "Never tell the user to copy, paste, manually insert, or manually apply the answer."
      : "",
    getAutomaticActionInstruction(documentAction),
    "Use Markdown when lists, headings, or emphasis make the answer clearer.",
    documentAction
      ? "Do not claim that the document has already changed while you are generating the answer."
      : "Do not claim to have changed the document yourself; the user applies your response with explicit buttons.",
    "",
    "Current document title:",
    cleanDocumentTitle,
    "",
    "Current document plain text:",
    cleanDocumentText,
    documentAction === "edit_blocks" ? "\nCurrent document blocks:\n" + formatDocumentBlocks(documentBlocks) : "",
    selectionText ? "\nCurrent selected text:\n" + selectionText : "",
  ].join("\n");
}

function getAutomaticActionInstruction(documentAction: AiChatDocumentAction | null) {
  if (documentAction === "edit_blocks") {
    return [
      "The requested automatic action is: edit the document with block-level operations.",
      "Return only valid JSON, with no Markdown fences and no prose.",
      "Schema: {\"summary\":\"short user-facing summary\",\"operations\":[{\"type\":\"insert_after_block|insert_before_block|replace_block|delete_block|replace_text_in_block\",\"blockId\":\"block_1\",\"content\":\"Markdown content for insert/replace block\",\"targetText\":\"exact text to replace for replace_text_in_block\",\"replacementText\":\"replacement text for replace_text_in_block\"}]}",
      "Use only blockId values from Current document blocks.",
      "For location requests, choose the closest matching block and use insert_after_block or insert_before_block.",
      "For small changes inside an existing formatted block, prefer replace_text_in_block so the original heading, list, link, and inline formatting are preserved.",
      "For whole-block content changes, prefer replace_block or delete_block over replacing the whole document.",
      "Operation content can be Markdown or minimal HTML when HTML is necessary to preserve links or strikethrough.",
      "When replacing a formatted block, preserve the original block's Markdown structure unless the user explicitly asks to remove or change that formatting.",
    ].join(" ");
  }

  if (documentAction === "insert_end") {
    return "The requested automatic action is: insert your answer at the end of the document. Return only the exact content that should be inserted. Do not say you inserted it, and do not include surrounding explanation unless it is part of the inserted content.";
  }

  if (documentAction === "insert_cursor") {
    return "The requested automatic action is: insert your answer at the current cursor position. Return only the exact content that should be inserted. Do not say you inserted it, and do not include surrounding explanation unless it is part of the inserted content.";
  }

  if (documentAction === "replace_document") {
    return "The requested automatic action is: replace the current document body with your answer. Return the complete new document body in Markdown. Preserve useful existing content unless the user explicitly asks to remove it. Do not explain the change, and do not say you replaced the document.";
  }

  if (documentAction === "replace_selection") {
    return "The requested automatic action is: replace the selected text with your answer. Return only the exact replacement content. Do not quote the original text, do not explain the change, and do not say you replaced it.";
  }

  return "";
}

function formatDocumentBlocks(blocks: AiChatDocumentBlock[]) {
  if (!blocks.length) {
    return "(empty)";
  }

  return blocks
    .map((block) => {
      const level = block.level ? ` level=${block.level}` : "";
      const text = block.text.trim() || "(empty)";
      const markdown = block.markdown?.trim()
        ? ` markdown=${JSON.stringify(block.markdown.trim())}`
        : "";
      const html = block.html?.trim() ? ` html=${JSON.stringify(block.html.trim())}` : "";
      return `- ${block.id}: type=${block.type}${level} text=${JSON.stringify(text)}${markdown}${html}`;
    })
    .join("\n");
}
