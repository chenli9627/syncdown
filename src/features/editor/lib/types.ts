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
  left: number;
  pos: number;
  top: number;
  width: number;
};

export type BlockDragState = {
  active: boolean;
  draggedPos: number | null;
  dropPos: number | null;
  indicatorTop: number | null;
  previewHeight: number | null;
  previewHtml: string | null;
  previewLeft: number | null;
  previewScale: number | null;
  previewTop: number | null;
  previewWidth: number | null;
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
  error: string | null;
  from: number;
  left: number;
  loading: boolean;
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

export type PresenceEntry = {
  anchor: number;
  head: number;
  name: string;
  updatedAt: string;
  userId: string;
};

export type RemoteCursorMarker = {
  color: string;
  label: string;
  left: number;
  top: number;
  userId: string;
};

export type PresenceParticipant = {
  color: string;
  name: string;
  userId: string;
};
