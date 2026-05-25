import type {
  AiChatDocumentBlock,
  AiChatResponseMode,
  AiChatSelection,
} from "@/features/app-state/types";

export function buildDocumentChatSystemPrompt(
  documentTitle: string,
  documentText: string,
  documentBlocks: AiChatDocumentBlock[],
  selection: AiChatSelection | null,
  modelName: string,
  responseMode: AiChatResponseMode | null,
) {
  const cleanDocumentTitle = documentTitle.trim() || "(untitled document)";
  const cleanDocumentText = documentText.trim() || "(empty document)";
  const selectionText = selection?.text.trim();

  return [
    "You are Syncdown's document assistant.",
    `The currently selected AI model is exactly: ${modelName}.`,
    "If the user asks what model you are, answer with that exact model name and do not claim to be a different model.",
    "This AI chat discusses the current document and related questions. It does not edit the document.",
    "If the user asks you to modify, insert into, delete from, or rewrite the document directly, explain briefly that this chat can discuss or draft the change but does not perform document edits.",
    "You can help the user discuss, explain, summarize, expand, translate, and structure the current document.",
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
    "Use Markdown when lists, headings, or emphasis make the answer clearer.",
    "If the user asks for a list, return a real Markdown list with list markers instead of another heading outline.",
    "If the user asks for key points, return a concise Markdown bullet list of those points.",
    "If the user asks for a table, return a real Markdown table instead of prose that only looks tabular.",
    getResponseModeInstruction(responseMode),
    "",
    "Current document title:",
    cleanDocumentTitle,
    "",
    "Current document plain text:",
    cleanDocumentText,
    "\nCurrent document blocks with rich-text structure:",
    formatDocumentBlocks(documentBlocks),
    "Use block markdown/html fields to answer questions about formatting such as bold, italic, strikethrough, inline code, links, headings, lists, tasks, tables, and other rich-text structure. Plain text alone does not show formatting.",
    selectionText ? "\nCurrent selected text:\n" + selectionText : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function getResponseModeInstruction(responseMode: AiChatResponseMode | null) {
  if (responseMode === "list") {
    return "This turn is a list-format transform. Return only the final Markdown list itself. Every non-empty item line must use a list marker such as - or 1. Do not add any lead-in sentence such as 好的，下面是..., 以下是..., Here is..., or Below is....";
  }

  if (responseMode === "table") {
    return "This turn is a table-format transform. Return only the final Markdown table itself, optionally with a short table title line if the user asked for one. Do not add any lead-in sentence such as 好的，下面是..., 以下是..., Here is..., or Below is....";
  }

  if (responseMode === "key_points") {
    return "This turn is a key-points transform. Return only the final Markdown bullet list of key points. Every non-empty item line must use a list marker such as - or 1. Do not add any lead-in sentence such as 好的，下面是..., 以下是..., Here is..., or Below is....";
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
