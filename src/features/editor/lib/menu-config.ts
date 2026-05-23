import { TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import type { MessageKey } from "@/lib/i18n/messages";
import type { BlockTransformItem, SlashItem } from "@/features/editor/lib/types";
import {
  normalizeParagraphTransform,
  normalizeListTransform,
  setSelectionToBlock,
  unwrapListIfNeeded,
  unwrapCodeBlockIfNeeded,
  unwrapQuoteIfNeeded,
} from "@/features/editor/lib/utils";

type Translate = (key: MessageKey) => string;

export function createSlashItems(t: Translate): SlashItem[] {
  return slashItemConfigs.map((config) => createSlashItem(config, t));
}

export function createBlockTransformItems(t: Translate): BlockTransformItem[] {
  return blockTransformConfigs.map((config) => createBlockTransformItem(config, t));
}

type MenuEditorAction = (editor: Editor) => void;

type SlashItemConfig = {
  id: string;
  labelKey: MessageKey;
  run: MenuEditorAction;
  shortcut: string;
};

type BlockTransformConfig = {
  id: string;
  labelKey: MessageKey;
  run: MenuEditorAction;
};

const slashItemConfigs: SlashItemConfig[] = [
  { id: "text", labelKey: "text", shortcut: "", run: runParagraph },
  { id: "heading-1", labelKey: "heading1", shortcut: "#", run: createHeadingAction(1) },
  { id: "heading-2", labelKey: "heading2", shortcut: "##", run: createHeadingAction(2) },
  { id: "heading-3", labelKey: "heading3", shortcut: "###", run: createHeadingAction(3) },
  { id: "heading-4", labelKey: "heading4", shortcut: "####", run: createHeadingAction(4) },
  { id: "heading-5", labelKey: "heading5", shortcut: "#####", run: createHeadingAction(5) },
  { id: "heading-6", labelKey: "heading6", shortcut: "######", run: createHeadingAction(6) },
  { id: "bullet-list", labelKey: "bulletedList", shortcut: "-", run: runBulletList },
  { id: "ordered-list", labelKey: "numberedList", shortcut: "1.", run: runOrderedList },
  { id: "todo-list", labelKey: "todoList", shortcut: "[]", run: runTaskList },
  { id: "quote", labelKey: "quote", shortcut: "\"", run: runQuote },
  { id: "table", labelKey: "table", shortcut: "||", run: runTable },
  { id: "table-of-contents", labelKey: "tableOfContents", shortcut: "toc", run: runTableOfContents },
  { id: "divider", labelKey: "divider", shortcut: "--", run: runDivider },
  { id: "code", labelKey: "code", shortcut: "```", run: runCodeBlock },
];

const blockTransformConfigs: BlockTransformConfig[] = [
  { id: "paragraph", labelKey: "text", run: runParagraphWithUnwrap },
  { id: "heading-1", labelKey: "heading1", run: createHeadingTransformAction(1) },
  { id: "heading-2", labelKey: "heading2", run: createHeadingTransformAction(2) },
  { id: "heading-3", labelKey: "heading3", run: createHeadingTransformAction(3) },
  { id: "heading-4", labelKey: "heading4", run: createHeadingTransformAction(4) },
  { id: "heading-5", labelKey: "heading5", run: createHeadingTransformAction(5) },
  { id: "heading-6", labelKey: "heading6", run: createHeadingTransformAction(6) },
  { id: "bullet-list", labelKey: "bulletedList", run: runBulletList },
  { id: "ordered-list", labelKey: "numberedList", run: runOrderedList },
  { id: "todo-list", labelKey: "todoList", run: runTaskList },
  { id: "quote", labelKey: "quote", run: runQuote },
  { id: "code", labelKey: "code", run: runCodeBlock },
];

function createSlashItem(config: SlashItemConfig, t: Translate): SlashItem {
  return {
    id: config.id,
    label: t(config.labelKey),
    run: config.run,
    shortcut: config.shortcut,
  };
}

function createBlockTransformItem(config: BlockTransformConfig, t: Translate): BlockTransformItem {
  return {
    id: config.id,
    label: t(config.labelKey),
    run: (editor, pos) => {
      const currentNode = editor.state.doc.nodeAt(pos);

      if (currentNode?.type.name === "table") {
        replaceTableWithBlock(editor, pos, config.id);
        return;
      }

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

function createHeadingAction(level: 1 | 2 | 3 | 4 | 5 | 6): MenuEditorAction {
  return (editor) => {
    editor.chain().focus().setHeading({ level }).run();
  };
}

function createHeadingTransformAction(level: 1 | 2 | 3 | 4 | 5 | 6): MenuEditorAction {
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

function runQuote(editor: Editor) {
  unwrapListIfNeeded(editor);
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
  unwrapQuoteIfNeeded(editor);
  editor.chain().focus().toggleCodeBlock().run();
}

function runTable(editor: Editor, pos?: number) {
  const currentNode = typeof pos === "number" ? editor.state.doc.nodeAt(pos) : null;

  if (currentNode?.type.name === "table" || editor.isActive("table")) {
    return;
  }

  if (typeof pos !== "number" || !currentNode) {
    normalizeParagraphTransform(editor);
    editor.chain().focus().insertTable({ cols: 2, rows: 3, withHeaderRow: true }).run();
    return;
  }

  const { schema } = editor.state;
  const text = currentNode.textContent.trim();
  const paragraph = (value = "") =>
    schema.nodes.paragraph.create(
      null,
      value ? schema.text(value) : undefined,
    );
  const headerCell = (value = "") =>
    schema.nodes.tableHeader.create(null, paragraph(value));
  const bodyCell = (value = "") =>
    schema.nodes.tableCell.create(null, paragraph(value));
  const tableNode = schema.nodes.table.create(null, [
    schema.nodes.tableRow.create(null, [headerCell(text), headerCell("")]),
    schema.nodes.tableRow.create(null, [bodyCell(""), bodyCell("")]),
    schema.nodes.tableRow.create(null, [bodyCell(""), bodyCell("")]),
  ]);
  const end = pos + currentNode.nodeSize;
  const tr = editor.state.tr.replaceWith(pos, end, tableNode);
  const selectionPos = Math.min(pos + 4, tr.doc.content.size);

  tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos)));
  editor.view.dispatch(tr);
  editor.view.focus();
}

function runTableOfContents(editor: Editor) {
  normalizeParagraphTransform(editor);
  editor.chain().focus().insertContent({ type: "tableOfContents" }).run();
}

function replaceTableWithBlock(
  editor: Editor,
  pos: number,
  targetId: BlockTransformConfig["id"],
) {
  const tableNode = editor.state.doc.nodeAt(pos);

  if (!tableNode || tableNode.type.name !== "table") {
    return;
  }

  const lines = getTableLines(tableNode);

  setSelectionToBlock(editor, pos);
  editor.chain().focus().deleteTable().run();

  const content = buildReplacementContent(targetId, lines);

  if (!content) {
    return;
  }

  editor.chain().focus().insertContent(content).run();
}

function getTableLines(tableNode: NonNullable<ReturnType<Editor["state"]["doc"]["nodeAt"]>>) {
  const lines: string[] = [];

  tableNode.forEach((row) => {
    const cells: string[] = [];

    row.forEach((cell) => {
      cells.push(cell.textContent.trim());
    });

    lines.push(cells.join(" | ").trim());
  });

  return lines.filter((line, index) => line.length > 0 || index === 0);
}

function buildReplacementContent(
  targetId: BlockTransformConfig["id"],
  lines: string[],
) {
  const firstLine = lines[0] ?? "";

  switch (targetId) {
    case "paragraph":
      return lines.map((line) => ({ type: "paragraph", content: line ? [{ type: "text", text: line }] : [] }));
    case "heading-1":
      return { type: "heading", attrs: { level: 1 }, content: firstLine ? [{ type: "text", text: firstLine }] : [] };
    case "heading-2":
      return { type: "heading", attrs: { level: 2 }, content: firstLine ? [{ type: "text", text: firstLine }] : [] };
    case "heading-3":
      return { type: "heading", attrs: { level: 3 }, content: firstLine ? [{ type: "text", text: firstLine }] : [] };
    case "heading-4":
      return { type: "heading", attrs: { level: 4 }, content: firstLine ? [{ type: "text", text: firstLine }] : [] };
    case "heading-5":
      return { type: "heading", attrs: { level: 5 }, content: firstLine ? [{ type: "text", text: firstLine }] : [] };
    case "heading-6":
      return { type: "heading", attrs: { level: 6 }, content: firstLine ? [{ type: "text", text: firstLine }] : [] };
    case "bullet-list":
      return {
        type: "bulletList",
        content: lines.map((line) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: line ? [{ type: "text", text: line }] : [] }],
        })),
      };
    case "ordered-list":
      return {
        type: "orderedList",
        content: lines.map((line) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: line ? [{ type: "text", text: line }] : [] }],
        })),
      };
    case "todo-list":
      return {
        type: "taskList",
        content: lines.map((line) => ({
          type: "taskItem",
          attrs: { checked: false },
          content: [{ type: "paragraph", content: line ? [{ type: "text", text: line }] : [] }],
        })),
      };
    case "quote":
      return {
        type: "blockquote",
        content: lines.map((line) => ({
          type: "paragraph",
          content: line ? [{ type: "text", text: line }] : [],
        })),
      };
    case "code":
      return {
        type: "codeBlock",
        content: lines.join("\n") ? [{ type: "text", text: lines.join("\n") }] : [],
      };
    default:
      return null;
  }
}
