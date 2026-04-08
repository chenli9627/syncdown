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
  top: number;
};

export type HoveredBlock = {
  height: number;
  pos: number;
  top: number;
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
