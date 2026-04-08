import type { Editor } from "@tiptap/react";

export type SlashItem = {
  id: string;
  label: string;
  shortcut: string;
  enabled: boolean;
  run: (editor: Editor) => void;
};

export type SlashContext = {
  from: number;
  query: string;
  to: number;
};

export type SlashMenuState = {
  activeIndex: number;
  left: number;
  open: boolean;
  placement: "above" | "below";
  query: string;
  removeTriggerOnClose: boolean;
  top: number;
};

export type HoveredBlock = {
  height: number;
  pos: number;
  top: number;
};

export type BlockDragState = {
  active: boolean;
  draggedPos: number | null;
  dropPos: number | null;
  indicatorTop: number | null;
};

export type SelectionBubbleState = {
  from: number;
  left: number;
  open: boolean;
  text: string;
  to: number;
  top: number;
};

export type AiBubbleState = {
  action: import("@/features/editor/lib/ai").AiActionKind | null;
  from: number;
  left: number;
  open: boolean;
  prompt: string;
  result: string;
  text: string;
  to: number;
  top: number;
  viewOnly: boolean;
};

export type BlockTransformItem = {
  id: string;
  label: string;
  run: (editor: Editor, pos: number) => void;
};

export type AccessEntry = {
  email: string;
  id: string;
  name: string;
  permission: "owner" | "can_edit" | "can_view";
  userId: string;
};
