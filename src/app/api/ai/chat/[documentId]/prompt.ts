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
  applicationStatusNotices: string[] = [],
) {
  const cleanDocumentTitle = documentTitle.trim() || "(untitled document)";
  const cleanDocumentText = documentText.trim() || "(empty document)";
  const selectionText = selection?.text.trim();
  const cleanApplicationStatusNotices = applicationStatusNotices
    .map((notice) => notice.trim())
    .filter(Boolean)
    .slice(-8);
  const latestApplicationStatusNotice =
    cleanApplicationStatusNotices[cleanApplicationStatusNotices.length - 1] ?? "";

  return [
    "You are Syncdown's document assistant.",
    `The currently selected AI model is exactly: ${modelName}.`,
    "If the user asks what model you are, answer with that exact model name and do not claim to be a different model.",
    "You can help the user discuss, rewrite, summarize, expand, translate, and structure the current document.",
    "You have a fetch_url tool for public HTTP(S) pages. Use it only when the user explicitly asks for web/current information or asks you to open/read a URL.",
    "The fetch_url tool returns long pages in chunks. If hasMore is true and the user needs the full page, call fetch_url again with start set to nextStart.",
    "Never ask the user for permission to continue reading the same public URL; continue automatically within the available tool steps.",
    "Do not answer that a page is too long before you have fetched the available chunks needed for the user's request.",
    "Do not describe internal tool calls, request counts, offsets, chunk sizes, hasMore, nextStart, or total character counts in the final answer.",
    "After using tools, answer the user's actual question directly unless the user explicitly asks how the information was fetched.",
    "Do not use fetch_url for local, private-network, or non-HTTP(S) URLs. If a page cannot be fetched, explain the limitation briefly.",
    "Never output pseudo tool-call markup, provider control tokens, DSML tags, invoke tags, parameter tags, or tool_calls text. Use the real fetch_url tool instead.",
    "When using fetched web content, do not copy raw HTML tags or angle-bracket markup unless the user explicitly asks for source code.",
    "Never add UI instructions such as clicking Apply, clicking a button, using the top-right corner, or manually applying the answer.",
    "Never tell the user to copy, paste, manually insert, or manually apply content to the document.",
    "In Syncdown, automatic document actions are real app-driven edits. Do not apologize by saying you cannot directly modify the document when the user's request is a document edit.",
    "If earlier assistant messages say you cannot directly modify the document or ask the user to copy content manually, treat those messages as obsolete and do not repeat that behavior.",
    "If the user asks whether a previous document edit happened, verify against the current document title, text, blocks, and explicit Syncdown status notices. If the requested change is not visible in the current document, say it was not applied.",
    "For follow-up phrases such as just now, previous, last time, 刚才, 上次, or 之前, treat the latest explicit Syncdown status notice as authoritative for the most recent attempted document operation.",
    "If the latest explicit Syncdown status notice says 未修改文档 or Document was not changed, say the most recent attempted operation did not modify the document, even if the current document already matches the requested end state because of an earlier operation.",
    "Never claim you checked the live editor after your response. You only know the current document snapshot included in this request and any explicit Syncdown status notices in the conversation.",
    documentAction
      ? "The app will automatically apply your next answer as the payload for the requested document action."
      : "When the user asks for an edit, return content that can be inserted into the document directly.",
    documentAction
      ? "Never tell the user to copy, paste, manually insert, or manually apply the answer."
      : "",
    getAutomaticActionInstruction(documentAction),
    "Use Markdown when lists, headings, or emphasis make the answer clearer.",
    documentAction
      ? "Do not claim that the document has already changed while you are generating the answer."
      : "Do not invent a new document change for this turn. Treat previous document edits as successful only when explicit Syncdown status notices or the current document snapshot show the change.",
    "",
    "Current document title:",
    cleanDocumentTitle,
    "",
    "Current document plain text:",
    cleanDocumentText,
    documentAction === "edit_blocks" ? "\nCurrent document blocks:\n" + formatDocumentBlocks(documentBlocks) : "",
    selectionText ? "\nCurrent selected text:\n" + selectionText : "",
    cleanApplicationStatusNotices.length
      ? "\nRecent explicit Syncdown status notices:\n" +
          cleanApplicationStatusNotices
            .map((notice) =>
              notice === latestApplicationStatusNotice ? `- latest: ${notice}` : `- ${notice}`,
            )
            .join("\n")
      : "",
  ].join("\n");
}

function getAutomaticActionInstruction(documentAction: AiChatDocumentAction | null) {
  if (documentAction === "edit_blocks") {
    return [
      "The requested automatic action is: edit the document with block-level operations.",
      "Return only valid JSON, with no Markdown fences and no prose.",
      "Never return pseudo tool-call markup or a fetch_url request as text. If current web data cannot be fetched reliably, return JSON with a short summary and an empty operations array.",
      "Schema: {\"summary\":\"short user-facing summary\",\"operations\":[{\"type\":\"insert_after_block|insert_before_block|replace_block|delete_block|move_block|copy_block|replace_text_in_block|replace_all_text|set_heading_level|set_block_type|set_list_type|set_task_item_checked|set_text_marks|unset_text_marks|set_link|unset_link|update_table_cell|insert_table_row_before|insert_table_row_after|delete_table_row|insert_table_column_before|insert_table_column_after|delete_table_column|toggle_table_header_row\",\"blockId\":\"block_1\",\"targetBlockId\":\"block_2\",\"placement\":\"before|after\",\"content\":\"Markdown content for insert/replace/update cell\",\"targetText\":\"exact text to replace or format\",\"replacementText\":\"replacement text for replace_text_in_block or replace_all_text\",\"level\":1,\"blockType\":\"paragraph|heading|codeBlock\",\"listType\":\"bulletList|orderedList|taskList\",\"checked\":true,\"marks\":[\"bold\",\"italic\"],\"href\":\"https://example.com\",\"row\":1,\"column\":1}]}",
      "The summary must say what changed and where it was placed, using nearby block text when possible.",
      "Use only blockId values from Current document blocks.",
      "Do not use image or media operations; this assistant only edits document text and structure.",
      "For heading level changes, use set_heading_level with level 1, 2, 3, 4, 5, or 6.",
      "For paragraph/heading/code block conversions, use set_block_type; use level when blockType is heading.",
      "For list conversion, use set_list_type with listType bulletList, orderedList, or taskList.",
      "For task checkbox changes, use set_task_item_checked with exact targetText and checked true or false.",
      "For moving or copying blocks, use move_block or copy_block with targetBlockId and placement before or after.",
      "For bold, italic, strikethrough, or inline code changes, use set_text_marks or unset_text_marks with exact targetText and marks.",
      "For all/every occurrences of a text mark or text replacement request, include one operation for each matching block. One set_text_marks, unset_text_marks, or replace_all_text operation applies to every occurrence of targetText inside its target block.",
      "For link changes, use set_link with exact targetText and href, or unset_link with exact targetText.",
      "For document-wide exact replacements, use replace_all_text with targetText and replacementText.",
      "For table cell changes, use update_table_cell with one-based row and column plus content.",
      "For table structure changes, use insert_table_row_before, insert_table_row_after, delete_table_row, insert_table_column_before, insert_table_column_after, delete_table_column, or toggle_table_header_row.",
      "When adding a table column with a requested header, put the new header text in the insert_table_column_before/after operation's content field instead of a separate update_table_cell operation.",
      "For location requests, choose the closest matching block and use insert_after_block or insert_before_block.",
      "If the user asks to put, add, insert, or write generated content into the document but does not specify a location, insert it after the last non-empty document block.",
      "For small changes inside an existing formatted block, prefer replace_text_in_block so the original heading, list, link, and inline formatting are preserved.",
      "For whole-block content changes, prefer replace_block or delete_block over replacing the whole document.",
      "For one table, paragraph, heading, list, or section change, never return the full document body.",
      "If the requested edit is unsupported, too complex, ambiguous, or cannot be represented by the listed operation types, return {\"summary\":\"I cannot do that edit yet.\",\"operations\":[]} and do not pretend it was applied.",
      "If you cannot find a matching blockId or exact targetText, return {\"summary\":\"No matching document target found.\",\"operations\":[]} instead of returning prose or a full document.",
      "Never return a rewritten full document as a workaround for an unsupported, too complex, ambiguous, or unlocatable edit.",
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
