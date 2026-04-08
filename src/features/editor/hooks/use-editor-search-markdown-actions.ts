"use client";

import type { EditorActionBaseArgs } from "@/features/editor/lib/editor-action-types";
import {
  exportEditorMarkdown,
  importEditorMarkdown,
} from "@/features/editor/lib/editor-markdown-actions";
import { runEditorSearch } from "@/features/editor/lib/editor-search-actions";

type UseEditorSearchMarkdownActionsArgs = EditorActionBaseArgs;

export function useEditorSearchMarkdownActions(
  args: UseEditorSearchMarkdownActionsArgs,
) {
  function runSearch(direction: "forward" | "backward") {
    runEditorSearch(args, direction);
  }

  async function handleExportMarkdown() {
    exportEditorMarkdown(args);
  }

  async function handleImportMarkdown(file: File) {
    await importEditorMarkdown(args, file);
  }

  return {
    handleExportMarkdown,
    handleImportMarkdown,
    runSearch,
  };
}
