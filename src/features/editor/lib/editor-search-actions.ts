import { collectSearchMatches, getSearchRects } from "@/features/editor/lib/search";
import type { EditorActionBaseArgs } from "@/features/editor/lib/editor-action-types";

export function runEditorSearch(args: EditorActionBaseArgs, direction: "forward" | "backward") {
  const query = args.searchQuery.trim();
  if (!query) {
    args.setSearchRects([]);
    args.setSearchMatchCount(0);
    args.setSearchMatchIndex(-1);
    args.setSearchNotice("Enter text to search");
    return;
  }

  const container = args.editorContainerRef.current;
  const editorRoot = container?.querySelector(".ProseMirror");
  if (!(editorRoot instanceof HTMLElement) || !(container instanceof HTMLElement)) {
    args.setSearchRects([]);
    args.setSearchMatchCount(0);
    args.setSearchNotice("No match found");
    return;
  }

  const matches = collectSearchMatches(editorRoot, query);
  if (!matches.length) {
    args.setSearchRects([]);
    args.setSearchMatchCount(0);
    args.setSearchMatchIndex(-1);
    args.setSearchNotice("No match found");
    return;
  }

  const nextIndex =
    args.searchMatchIndex < 0
      ? direction === "forward"
        ? 0
        : matches.length - 1
      : direction === "forward"
        ? (args.searchMatchIndex + 1) % matches.length
        : (args.searchMatchIndex - 1 + matches.length) % matches.length;

  const nextMatch = matches[nextIndex];
  args.setSearchRects(getSearchRects(nextMatch.range, container));
  args.setSearchMatchCount(matches.length);
  args.setSearchMatchIndex(nextIndex);
  args.setSearchNotice(null);
  nextMatch.range.startContainer.parentElement?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  window.requestAnimationFrame(() => {
    args.searchInputRef.current?.focus();
    const length = args.searchInputRef.current?.value.length ?? 0;
    args.searchInputRef.current?.setSelectionRange(length, length);
  });
}
