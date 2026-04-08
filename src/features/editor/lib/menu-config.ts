import type { Editor } from "@tiptap/react";
import type { BlockTransformItem, SlashItem } from "@/features/editor/lib/types";
import {
  normalizeParagraphTransform,
  normalizeListTransform,
  setSelectionToBlock,
  unwrapDetailsIfNeeded,
  unwrapListIfNeeded,
  unwrapCodeBlockIfNeeded,
  unwrapQuoteIfNeeded,
} from "@/features/editor/lib/utils";

export function createSlashItems(): SlashItem[] {
  return slashItemConfigs.map(createSlashItem);
}

export function createBlockTransformItems(): BlockTransformItem[] {
  return blockTransformConfigs.map(createBlockTransformItem);
}

type MenuEditorAction = (editor: Editor) => void;

type SlashItemConfig = {
  enabled?: boolean;
  id: string;
  label: string;
  run: MenuEditorAction;
  shortcut: string;
};

type BlockTransformConfig = {
  id: string;
  label: string;
  run: MenuEditorAction;
};

const slashItemConfigs: SlashItemConfig[] = [
  { id: "text", label: "Text", shortcut: "", run: runParagraph },
  { id: "heading-1", label: "Heading 1", shortcut: "#", run: createHeadingAction(1) },
  { id: "heading-2", label: "Heading 2", shortcut: "##", run: createHeadingAction(2) },
  { id: "heading-3", label: "Heading 3", shortcut: "###", run: createHeadingAction(3) },
  { id: "heading-4", label: "Heading 4", shortcut: "####", run: createHeadingAction(4) },
  { id: "bullet-list", label: "Bulleted list", shortcut: "-", run: runBulletList },
  { id: "ordered-list", label: "Numbered list", shortcut: "1.", run: runOrderedList },
  { id: "todo-list", label: "Todo list", shortcut: "[]", run: runTaskList },
  { id: "toggle-list", label: "Toggle list", shortcut: ">", run: runToggleList },
  { id: "quote", label: "Quote", shortcut: "\"", run: runQuote },
  { id: "table", label: "Table", shortcut: "", enabled: false, run: noopEditorAction },
  { id: "divider", label: "Divider", shortcut: "--", run: runDivider },
  { id: "code", label: "Code", shortcut: "```", run: runCodeBlock },
];

const blockTransformConfigs: BlockTransformConfig[] = [
  { id: "paragraph", label: "Text", run: runParagraphWithUnwrap },
  { id: "heading-1", label: "Heading 1", run: createHeadingTransformAction(1) },
  { id: "heading-2", label: "Heading 2", run: createHeadingTransformAction(2) },
  { id: "heading-3", label: "Heading 3", run: createHeadingTransformAction(3) },
  { id: "heading-4", label: "Heading 4", run: createHeadingTransformAction(4) },
  { id: "bullet-list", label: "Bulleted list", run: runBulletList },
  { id: "ordered-list", label: "Numbered list", run: runOrderedList },
  { id: "todo-list", label: "Todo list", run: runTaskList },
  { id: "toggle-list", label: "Toggle list", run: runToggleList },
  { id: "quote", label: "Quote", run: runQuote },
  { id: "code", label: "Code", run: runCodeBlock },
];

function createSlashItem(config: SlashItemConfig): SlashItem {
  return {
    enabled: config.enabled ?? true,
    id: config.id,
    label: config.label,
    run: config.run,
    shortcut: config.shortcut,
  };
}

function createBlockTransformItem(config: BlockTransformConfig): BlockTransformItem {
  return {
    id: config.id,
    label: config.label,
    run: (editor, pos) => {
      setSelectionToBlock(editor, pos);
      config.run(editor);
    },
  };
}

function runParagraph(editor: Editor) {
  editor.chain().focus().setParagraph().run();
}

function runParagraphWithUnwrap(editor: Editor) {
  if (editor.isActive("blockquote")) {
    editor.chain().focus().lift("blockquote").setParagraph().run();
    return;
  }

  normalizeParagraphTransform(editor);
  runParagraph(editor);
}

function createHeadingAction(level: 1 | 2 | 3 | 4): MenuEditorAction {
  return (editor) => {
    editor.chain().focus().setHeading({ level }).run();
  };
}

function createHeadingTransformAction(level: 1 | 2 | 3 | 4): MenuEditorAction {
  return (editor) => {
    if (editor.isActive("blockquote")) {
      editor.chain().focus().lift("blockquote").setHeading({ level }).run();
      return;
    }

    normalizeParagraphTransform(editor);
    createHeadingAction(level)(editor);
  };
}

function runBulletList(editor: Editor) {
  if (editor.isActive("blockquote")) {
    editor.chain().focus().lift("blockquote").toggleBulletList().run();
    return;
  }

  normalizeListTransform(editor);
  editor.chain().focus().toggleBulletList().run();
}

function runOrderedList(editor: Editor) {
  if (editor.isActive("blockquote")) {
    editor.chain().focus().lift("blockquote").toggleOrderedList().run();
    return;
  }

  normalizeListTransform(editor);
  editor.chain().focus().toggleOrderedList().run();
}

function runTaskList(editor: Editor) {
  if (editor.isActive("blockquote")) {
    editor.chain().focus().lift("blockquote").toggleTaskList().run();
    return;
  }

  normalizeListTransform(editor);
  editor.chain().focus().toggleTaskList().run();
}

function runToggleList(editor: Editor) {
  if (editor.isActive("blockquote")) {
    editor.chain().focus().lift("blockquote").setDetails().run();
    return;
  }

  if (editor.isActive("details")) {
    editor.chain().focus().unsetDetails().run();
    return;
  }

  normalizeParagraphTransform(editor);
  editor.chain().focus().setDetails().run();
}

function runQuote(editor: Editor) {
  unwrapListIfNeeded(editor);
  unwrapDetailsIfNeeded(editor);
  unwrapCodeBlockIfNeeded(editor);
  editor.chain().focus().toggleBlockquote().run();
}

function runDivider(editor: Editor) {
  editor.chain().focus().setHorizontalRule().run();
}

function runCodeBlock(editor: Editor) {
  if (editor.isActive("blockquote")) {
    editor.chain().focus().lift("blockquote").toggleCodeBlock().run();
    return;
  }

  unwrapListIfNeeded(editor);
  unwrapDetailsIfNeeded(editor);
  unwrapQuoteIfNeeded(editor);
  editor.chain().focus().toggleCodeBlock().run();
}

function noopEditorAction() {}
