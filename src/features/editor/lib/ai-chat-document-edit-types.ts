import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { AiChatDocumentBlock } from "@/features/app-state/types";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type BlockTypeName = "codeBlock" | "heading" | "paragraph";
export type InlineMarkName = "bold" | "code" | "italic" | "strike";
export type ListTypeName = "bulletList" | "orderedList" | "taskList";
export type OperationPlacement = "after" | "before";

export type LocalAiDocumentBlock = AiChatDocumentBlock & {
  node: ProseMirrorNode;
  nodeSize: number;
  pos: number;
};

export type AiDocumentEditOperation = {
  blockType?: BlockTypeName;
  blockId: string;
  checked?: boolean;
  column?: number;
  content?: string;
  href?: string;
  level?: HeadingLevel;
  listType?: ListTypeName;
  mark?: InlineMarkName;
  marks?: InlineMarkName[];
  placement?: OperationPlacement;
  replacementText?: string;
  row?: number;
  targetBlockId?: string;
  targetText?: string;
  type:
    | "copy_block"
    | "delete_block"
    | "delete_table_column"
    | "delete_table_row"
    | "insert_after_block"
    | "insert_before_block"
    | "insert_table_column_after"
    | "insert_table_column_before"
    | "insert_table_row_after"
    | "insert_table_row_before"
    | "move_block"
    | "replace_all_text"
    | "replace_block"
    | "replace_text_in_block"
    | "set_block_type"
    | "set_heading_level"
    | "set_link"
    | "set_list_type"
    | "set_task_item_checked"
    | "set_text_marks"
    | "toggle_table_header_row"
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
  checked?: boolean;
  column?: number;
  content: string;
  href?: string;
  index: number;
  level?: HeadingLevel;
  listType?: ListTypeName;
  marks?: InlineMarkName[];
  nodeJson?: unknown;
  position: number;
  range: { from: number; to: number };
  row?: number;
  targetPosition?: number;
  targetText?: string;
  type: AiDocumentEditOperation["type"];
};
