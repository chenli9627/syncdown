import type { Editor } from "@tiptap/react";
import type { SlashContext, SlashItem, SlashMenuState } from "@/features/editor/lib/types";

type SlashMenuPosition = Pick<SlashMenuState, "left" | "placement" | "top">;

export function createInitialSlashMenuState(): SlashMenuState {
  return {
    activeIndex: 0,
    left: 0,
    open: false,
    placement: "below",
    query: "",
    removeTriggerOnClose: false,
    top: 0,
  };
}

export function closeSlashMenu(current: SlashMenuState): SlashMenuState {
  return {
    ...current,
    activeIndex: 0,
    open: false,
    placement: "below",
    query: "",
    removeTriggerOnClose: false,
  };
}

export function filterSlashItems(items: SlashItem[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(normalizedQuery) ||
      item.shortcut.toLowerCase().includes(normalizedQuery),
  );
}

export function getEnabledSlashItems(items: SlashItem[]) {
  return items.filter((item) => item.enabled);
}

export function getSlashMenuPosition(
  editor: Editor,
  container: HTMLElement,
  itemCount: number,
): SlashMenuPosition {
  const coords = editor.view.coordsAtPos(editor.state.selection.from);
  const bounds = container.getBoundingClientRect();
  const estimatedHeight = Math.min(itemCount * 38 + 10, 260);
  const spaceBelow = window.innerHeight - coords.bottom;
  const placeAbove = spaceBelow < estimatedHeight + 16 && coords.top > estimatedHeight;
  const nextTop = placeAbove
    ? coords.top - bounds.top - estimatedHeight - 10
    : coords.bottom - bounds.top + 10;

  return {
    left: Math.max(12, Math.min(coords.left - bounds.left, bounds.width - 228)),
    placement: placeAbove ? "above" : "below",
    top: Math.max(12, nextTop),
  };
}

export function getNextSlashIndex(current: number, direction: 1 | -1, length: number) {
  return (current + direction + length) % length;
}

export function runSlashItem(editor: Editor, slashContext: SlashContext, item: SlashItem) {
  editor.chain().focus().deleteRange({ from: slashContext.from, to: slashContext.to }).run();
  item.run(editor);
}

type SlashMenuKeyDownHandlerArgs = {
  editorRef: React.RefObject<Editor | null>;
  filteredSlashItemsRef: React.RefObject<SlashItem[]>;
  setSlashMenu: React.Dispatch<React.SetStateAction<SlashMenuState>>;
  slashContextRef: React.RefObject<SlashContext | null>;
  slashMenuRef: React.RefObject<SlashMenuState>;
};

export function handleSlashMenuKeyDownEvent(
  event: KeyboardEvent,
  {
    editorRef,
    filteredSlashItemsRef,
    setSlashMenu,
    slashContextRef,
    slashMenuRef,
  }: SlashMenuKeyDownHandlerArgs,
) {
  const enabledItems = getEnabledSlashItems(filteredSlashItemsRef.current);

  if (!slashMenuRef.current.open || !enabledItems.length) {
    return false;
  }

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    updateSlashMenuIndex(setSlashMenu, event.key === "ArrowDown" ? 1 : -1, enabledItems.length);
    return true;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    handleSlashMenuEnter(editorRef, enabledItems, setSlashMenu, slashContextRef, slashMenuRef);
    return true;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    setSlashMenu((current) => closeSlashMenu(current));
    return true;
  }

  return false;
}

export function createSlashMenuKeyDownHandler({
  editorRef,
  filteredSlashItemsRef,
  setSlashMenu,
  slashContextRef,
  slashMenuRef,
}: SlashMenuKeyDownHandlerArgs) {
  return (event: KeyboardEvent) =>
    handleSlashMenuKeyDownEvent(event, {
      editorRef,
      filteredSlashItemsRef,
      setSlashMenu,
      slashContextRef,
      slashMenuRef,
    });
}

function updateSlashMenuIndex(
  setSlashMenu: React.Dispatch<React.SetStateAction<SlashMenuState>>,
  direction: 1 | -1,
  length: number,
) {
  setSlashMenu((current) => ({
    ...current,
    activeIndex: getNextSlashIndex(current.activeIndex, direction, length),
  }));
}

function handleSlashMenuEnter(
  editorRef: React.RefObject<Editor | null>,
  enabledItems: SlashItem[],
  setSlashMenu: React.Dispatch<React.SetStateAction<SlashMenuState>>,
  slashContextRef: React.RefObject<SlashContext | null>,
  slashMenuRef: React.RefObject<SlashMenuState>,
) {
  const item = enabledItems[slashMenuRef.current.activeIndex] ?? enabledItems[0];
  const slashContext = slashContextRef.current;
  const editor = editorRef.current;

  if (!item || !slashContext || !editor) {
    return;
  }

  runSlashItem(editor, slashContext, item);
  setSlashMenu((current) => closeSlashMenu(current));
}
