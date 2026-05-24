import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { AiChatDocumentBlock } from "@/features/app-state/types";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type BlockTypeName = "codeBlock" | "heading" | "paragraph";
export type InlineMarkName = "bold" | "code" | "italic" | "strike";

export type LocalAiDocumentBlock = AiChatDocumentBlock & {
  node: ProseMirrorNode;
  nodeSize: number;
  pos: number;
};

export type AiDocumentEditOperation = {
  blockType?: BlockTypeName;
  blockId: string;
  column?: number;
  content?: string;
  href?: string;
  level?: HeadingLevel;
  mark?: InlineMarkName;
  marks?: InlineMarkName[];
  replacementText?: string;
  row?: number;
  targetText?: string;
  type:
    | "delete_block"
    | "insert_after_block"
    | "insert_before_block"
    | "replace_block"
    | "replace_text_in_block"
    | "set_block_type"
    | "set_heading_level"
    | "set_link"
    | "set_text_marks"
    | "unset_link"
    | "unset_text_marks"
    | "update_table_cell";
};

export type AiDocumentEditPayload = {
  operations?: AiDocumentEditOperation[];
  summary?: string;
};

export type ExecutableOperation = {
  blockType?: BlockTypeName;
  content: string;
  href?: string;
  index: number;
  level?: HeadingLevel;
  marks?: InlineMarkName[];
  position: number;
  range: { from: number; to: number };
  type: AiDocumentEditOperation["type"];
};
