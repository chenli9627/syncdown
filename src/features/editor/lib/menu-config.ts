import type { Editor } from "@tiptap/react";
import type { BlockTransformItem, SlashItem } from "@/features/editor/lib/types";
import { setSelectionToBlock, unwrapListIfNeeded } from "@/features/editor/lib/utils";

export function createSlashItems(): SlashItem[] {
  return [
    {
      id: "text",
      label: "Text",
      shortcut: "",
      enabled: true,
      run: (currentEditor) => {
        currentEditor.chain().focus().setParagraph().run();
      },
    },
    {
      id: "heading-1",
      label: "Heading 1",
      shortcut: "#",
      enabled: true,
      run: (currentEditor) => {
        currentEditor.chain().focus().setHeading({ level: 1 }).run();
      },
    },
    {
      id: "heading-2",
      label: "Heading 2",
      shortcut: "##",
      enabled: true,
      run: (currentEditor) => {
        currentEditor.chain().focus().setHeading({ level: 2 }).run();
      },
    },
    {
      id: "heading-3",
      label: "Heading 3",
      shortcut: "###",
      enabled: true,
      run: (currentEditor) => {
        currentEditor.chain().focus().setHeading({ level: 3 }).run();
      },
    },
    {
      id: "heading-4",
      label: "Heading 4",
      shortcut: "####",
      enabled: true,
      run: (currentEditor) => {
        currentEditor.chain().focus().setHeading({ level: 4 }).run();
      },
    },
    {
      id: "bullet-list",
      label: "Bulleted list",
      shortcut: "-",
      enabled: true,
      run: (currentEditor) => {
        currentEditor.chain().focus().toggleBulletList().run();
      },
    },
    {
      id: "ordered-list",
      label: "Numbered list",
      shortcut: "1.",
      enabled: true,
      run: (currentEditor) => {
        currentEditor.chain().focus().toggleOrderedList().run();
      },
    },
    {
      id: "todo-list",
      label: "Todo list",
      shortcut: "[]",
      enabled: false,
      run: () => {},
    },
    {
      id: "toggle-list",
      label: "Toggle list",
      shortcut: ">",
      enabled: false,
      run: () => {},
    },
    {
      id: "quote",
      label: "Quote",
      shortcut: "\"",
      enabled: true,
      run: (currentEditor) => {
        unwrapListIfNeeded(currentEditor);
        currentEditor.chain().focus().toggleBlockquote().run();
      },
    },
    {
      id: "table",
      label: "Table",
      shortcut: "",
      enabled: false,
      run: () => {},
    },
    {
      id: "divider",
      label: "Divider",
      shortcut: "--",
      enabled: true,
      run: (currentEditor) => {
        currentEditor.chain().focus().setHorizontalRule().run();
      },
    },
    {
      id: "code",
      label: "Code",
      shortcut: "```",
      enabled: true,
      run: (currentEditor) => {
        currentEditor.chain().focus().toggleCodeBlock().run();
      },
    },
  ];
}

export function createBlockTransformItems(): BlockTransformItem[] {
  return [
    {
      id: "paragraph",
      label: "Text",
      run: (currentEditor: Editor, pos: number) => {
        setSelectionToBlock(currentEditor, pos);
        unwrapListIfNeeded(currentEditor);
        currentEditor.chain().focus().setParagraph().run();
      },
    },
    {
      id: "heading-1",
      label: "Heading 1",
      run: (currentEditor: Editor, pos: number) => {
        setSelectionToBlock(currentEditor, pos);
        unwrapListIfNeeded(currentEditor);
        currentEditor.chain().focus().setHeading({ level: 1 }).run();
      },
    },
    {
      id: "heading-2",
      label: "Heading 2",
      run: (currentEditor: Editor, pos: number) => {
        setSelectionToBlock(currentEditor, pos);
        unwrapListIfNeeded(currentEditor);
        currentEditor.chain().focus().setHeading({ level: 2 }).run();
      },
    },
    {
      id: "heading-3",
      label: "Heading 3",
      run: (currentEditor: Editor, pos: number) => {
        setSelectionToBlock(currentEditor, pos);
        unwrapListIfNeeded(currentEditor);
        currentEditor.chain().focus().setHeading({ level: 3 }).run();
      },
    },
    {
      id: "heading-4",
      label: "Heading 4",
      run: (currentEditor: Editor, pos: number) => {
        setSelectionToBlock(currentEditor, pos);
        unwrapListIfNeeded(currentEditor);
        currentEditor.chain().focus().setHeading({ level: 4 }).run();
      },
    },
    {
      id: "bullet-list",
      label: "Bulleted list",
      run: (currentEditor: Editor, pos: number) => {
        setSelectionToBlock(currentEditor, pos);
        currentEditor.chain().focus().toggleBulletList().run();
      },
    },
    {
      id: "ordered-list",
      label: "Numbered list",
      run: (currentEditor: Editor, pos: number) => {
        setSelectionToBlock(currentEditor, pos);
        currentEditor.chain().focus().toggleOrderedList().run();
      },
    },
    {
      id: "quote",
      label: "Quote",
      run: (currentEditor: Editor, pos: number) => {
        setSelectionToBlock(currentEditor, pos);
        unwrapListIfNeeded(currentEditor);
        currentEditor.chain().focus().toggleBlockquote().run();
      },
    },
    {
      id: "code",
      label: "Code",
      run: (currentEditor: Editor, pos: number) => {
        setSelectionToBlock(currentEditor, pos);
        unwrapListIfNeeded(currentEditor);
        currentEditor.chain().focus().toggleCodeBlock().run();
      },
    },
  ];
}
