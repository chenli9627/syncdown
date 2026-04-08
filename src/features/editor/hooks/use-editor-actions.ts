"use client";

import type { Editor } from "@tiptap/react";
import { useMemo } from "react";
import {
  editorHtmlToMarkdown,
  markdownToEditorHtml,
  sanitizeMarkdownFilename,
} from "@/features/editor/lib/markdown";
import { collectSearchMatches, getSearchRects } from "@/features/editor/lib/search";
import type { BlockTransformItem, HoveredBlock } from "@/features/editor/lib/types";
import { getBlockTransformActiveId } from "@/features/editor/lib/utils";

type UseEditorActionsArgs = {
  blockMenu: {
    left: number;
    open: boolean;
    pos: number | null;
    showTurnInto: boolean;
    top: number;
  };
  canEditBody: boolean;
  document: {
    content: string;
    id: string;
    title: string;
  };
  editor: Editor | null;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  hoveredBlock: HoveredBlock | null;
  saveDocument: (
    documentId: string,
    patch: { content?: string; title?: string },
  ) => Promise<
    { error: string; ok: false } | { ok: true; document: { title: string } | null }
  >;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchMatchIndex: number;
  searchQuery: string;
  setActionError: (value: string | null) => void;
  setActionNotice: (value: string | null) => void;
  setBlockMenu: (
    value:
      | {
          left: number;
          open: boolean;
          pos: number | null;
          showTurnInto: boolean;
          top: number;
        }
      | ((current: {
            left: number;
            open: boolean;
            pos: number | null;
            showTurnInto: boolean;
            top: number;
          }) => {
            left: number;
            open: boolean;
            pos: number | null;
            showTurnInto: boolean;
            top: number;
          }),
  ) => void;
  setHoveredBlock: (value: HoveredBlock | null) => void;
  status: "idle" | "saving" | "saved" | "error";
  setSearchMatchCount: (value: number) => void;
  setSearchMatchIndex: (value: number) => void;
  setSearchNotice: (value: string | null) => void;
  setSearchRects: (value: ReturnType<typeof getSearchRects>) => void;
  syncHoveredBlockFromPos: (position: number) => void;
};

export function useEditorActions({
  blockMenu,
  canEditBody,
  document,
  editor,
  editorContainerRef,
  hoveredBlock,
  saveDocument,
  searchInputRef,
  searchMatchIndex,
  searchQuery,
  setActionError,
  setActionNotice,
  setBlockMenu,
  setHoveredBlock,
  setSearchMatchCount,
  setSearchMatchIndex,
  setSearchNotice,
  setSearchRects,
  syncHoveredBlockFromPos,
}: UseEditorActionsArgs) {
  const statusLabel =
    status === "saving"
      ? "Saving..."
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Save failed"
          : null;
  const currentTransformActiveId = useMemo(
    () =>
      editor && blockMenu.pos != null
        ? getBlockTransformActiveId(editor, blockMenu.pos)
        : null,
    [blockMenu.pos, editor],
  );

  const canUndo = Boolean(editor?.can().chain().focus().undo().run());

  function handleInsertBlockBefore() {
    if (!editor || !hoveredBlock) {
      return;
    }

    setBlockMenu({
      left: 0,
      open: false,
      pos: null,
      showTurnInto: false,
      top: 0,
    });

    editor
      .chain()
      .focus()
      .insertContentAt(hoveredBlock.pos, {
        type: "paragraph",
        content: [{ type: "text", text: "/" }],
      })
      .setTextSelection(hoveredBlock.pos + 2)
      .run();
  }

  function handleDuplicateBlock() {
    if (!editor || blockMenu.pos == null) {
      return;
    }

    const node = editor.state.doc.nodeAt(blockMenu.pos);

    if (!node) {
      return;
    }

    const duplicatedPos = blockMenu.pos + node.nodeSize;

    editor
      .chain()
      .focus()
      .insertContentAt(duplicatedPos, node.toJSON())
      .run();

    setBlockMenu({
      left: 0,
      open: false,
      pos: null,
      showTurnInto: false,
      top: 0,
    });

    window.requestAnimationFrame(() => {
      syncHoveredBlockFromPos(duplicatedPos);
    });
  }

  function handleDeleteBlock() {
    if (!editor || blockMenu.pos == null) {
      return;
    }

    const node = editor.state.doc.nodeAt(blockMenu.pos);

    if (!node) {
      return;
    }

    editor
      .chain()
      .focus()
      .deleteRange({ from: blockMenu.pos, to: blockMenu.pos + node.nodeSize })
      .run();

    setBlockMenu({
      left: 0,
      open: false,
      pos: null,
      showTurnInto: false,
      top: 0,
    });
    setHoveredBlock(null);
  }

  function handleTurnInto(item: BlockTransformItem) {
    if (!editor || blockMenu.pos == null) {
      return;
    }

    item.run(editor, blockMenu.pos);
    setBlockMenu({
      left: 0,
      open: false,
      pos: null,
      showTurnInto: false,
      top: 0,
    });
    window.requestAnimationFrame(() => {
      syncHoveredBlockFromPos(blockMenu.pos ?? 0);
    });
  }

  function runSearch(direction: "forward" | "backward") {
    const query = searchQuery.trim();

    if (!query) {
      setSearchRects([]);
      setSearchMatchCount(0);
      setSearchMatchIndex(-1);
      setSearchNotice("Enter text to search");
      return;
    }

    const container = editorContainerRef.current;
    const editorRoot = container?.querySelector(".ProseMirror");

    if (!(editorRoot instanceof HTMLElement) || !(container instanceof HTMLElement)) {
      setSearchRects([]);
      setSearchMatchCount(0);
      setSearchNotice("No match found");
      return;
    }

    const matches = collectSearchMatches(editorRoot, query);

    if (!matches.length) {
      setSearchRects([]);
      setSearchMatchCount(0);
      setSearchMatchIndex(-1);
      setSearchNotice("No match found");
      return;
    }

    const nextIndex =
      searchMatchIndex < 0
        ? direction === "forward"
          ? 0
          : matches.length - 1
        : direction === "forward"
          ? (searchMatchIndex + 1) % matches.length
          : (searchMatchIndex - 1 + matches.length) % matches.length;
    const nextMatch = matches[nextIndex];
    const nextRects = getSearchRects(nextMatch.range, container);

    setSearchRects(nextRects);
    setSearchMatchCount(matches.length);
    setSearchMatchIndex(nextIndex);
    setSearchNotice(null);
    nextMatch.range.startContainer.parentElement?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      const length = searchInputRef.current?.value.length ?? 0;
      searchInputRef.current?.setSelectionRange(length, length);
    });
  }

  async function handleExportMarkdown() {
    const html = editor?.getHTML() ?? document.content;
    const markdown = editorHtmlToMarkdown(html);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = globalThis.document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = sanitizeMarkdownFilename(document.title);
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
    setActionError(null);
    setActionNotice("Markdown exported");
  }

  async function handleImportMarkdown(file: File) {
    if (!canEditBody) {
      setActionError("You do not have permission to import");
      setActionNotice(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".md")) {
      setActionError("Only .md files are supported right now");
      setActionNotice(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setActionError("上传文件过大");
      setActionNotice(null);
      return;
    }

    const markdown = await file.text();
    const html = markdownToEditorHtml(markdown);

    if (!editor) {
      setActionError("Editor is not ready");
      setActionNotice(null);
      return;
    }

    editor.chain().focus().insertContent(html).run();
    const result = await saveDocument(document.id, { content: editor.getHTML() });

    if (!result.ok) {
      setActionError(result.error);
      setActionNotice(null);
      return;
    }

    setActionError(null);
    setActionNotice("Markdown imported");
  }

  return {
    canUndo,
    currentTransformActiveId,
    handleDeleteBlock,
    handleDuplicateBlock,
    handleExportMarkdown,
    handleImportMarkdown,
    handleInsertBlockBefore,
    handleTurnInto,
    runSearch,
    statusLabel,
  };
}
