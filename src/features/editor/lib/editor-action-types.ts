import type { Editor } from "@tiptap/react";
import type { getSearchRects } from "@/features/editor/lib/search";
import type { HoveredBlock } from "@/features/editor/lib/types";

export type EditorBlockMenuState = {
  left: number;
  open: boolean;
  pos: number | null;
  showTurnInto: boolean;
  turnIntoAlign: "bottom" | "top";
  top: number;
};

export type EditorActionDocument = {
  content: string;
  id: string;
  title: string;
};

export type SaveDocumentAction = (
  documentId: string,
  patch: { content?: string; title?: string },
) => Promise<{ error: string; ok: false } | { ok: true; document: { title: string } | null }>;

export type EditorActionStateSetters = {
  setActionError: (value: string | null) => void;
  setActionNotice: (value: string | null) => void;
  setBlockMenu: (
    value: EditorBlockMenuState | ((current: EditorBlockMenuState) => EditorBlockMenuState),
  ) => void;
  setHoveredBlock: (value: HoveredBlock | null) => void;
  setOverflowMenuOpen?: (value: boolean | ((current: boolean) => boolean)) => void;
  setSearchMatchCount: (value: number) => void;
  setSearchMatchIndex: (value: number) => void;
  setSearchNotice: (value: string | null) => void;
  setSearchRects: (value: ReturnType<typeof getSearchRects>) => void;
};

export type EditorActionBaseArgs = EditorActionStateSetters & {
  blockMenu: EditorBlockMenuState;
  canEditBody: boolean;
  document: EditorActionDocument;
  editor: Editor | null;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  hoveredBlock: HoveredBlock | null;
  saveDocument: SaveDocumentAction;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchMatchIndex: number;
  searchQuery: string;
  syncHoveredBlockFromPos: (position: number) => void;
};
