"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/components/providers/locale-provider";
import type {
  DocumentRecord,
  SyntextState,
  User,
} from "@/features/app-state/types";
import { useAppState } from "@/features/app-state/providers/app-state-provider";
import { EditorBlockMenu } from "@/features/editor/components/editor-block-menu";
import { EditorBlockControls } from "@/features/editor/components/editor-block-controls";
import { EditorOverflowMenu } from "@/features/editor/components/editor-overflow-menu";
import { EditorPermissionDropdown } from "@/features/editor/components/editor-permission-dropdown";
import { EditorPermissionPopover } from "@/features/editor/components/editor-permission-popover";
import { EditorSearchPopover } from "@/features/editor/components/editor-search-popover";
import { EditorSlashMenu } from "@/features/editor/components/editor-slash-menu";
import { DocumentStatusState } from "@/features/editor/components/document-status-state";
import { EditorToolbar } from "@/features/editor/components/editor-toolbar";
import {
  editorHtmlToMarkdown,
  markdownToEditorHtml,
  sanitizeMarkdownFilename,
} from "@/features/editor/lib/markdown";
import {
  collectSearchMatches,
  getSearchRects,
  type SearchRect,
} from "@/features/editor/lib/search";
import type {
  AccessEntry,
  BlockTransformItem,
  HoveredBlock,
  SlashContext,
  SlashItem,
} from "@/features/editor/lib/types";

type DocumentEditorShellProps = {
  documentId: string;
};

type EditorSurfaceProps = {
  document: DocumentRecord;
  permission: "owner" | "can_edit" | "can_view";
  saveDocument: ReturnType<typeof useAppState>["saveDocument"];
};

function getBlockTransformActiveId(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);

  if (!node) {
    return "paragraph";
  }

  if (node.type.name === "heading") {
    return `heading-${node.attrs.level}`;
  }

  if (node.type.name === "bulletList") {
    return "bullet-list";
  }

  if (node.type.name === "orderedList") {
    return "ordered-list";
  }

  if (node.type.name === "blockquote") {
    return "quote";
  }

  if (node.type.name === "codeBlock") {
    return "code";
  }

  if (node.type.name === "horizontalRule") {
    return "divider";
  }

  return "paragraph";
}

function setSelectionToBlock(editor: Editor, pos: number) {
  editor.chain().focus().setTextSelection(pos + 1).run();
}

function unwrapListIfNeeded(editor: Editor) {
  if (editor.isActive("bulletList") || editor.isActive("orderedList")) {
    editor.chain().focus().liftListItem("listItem").run();
  }
}

function getTopLevelBlock(target: EventTarget | null, editorRoot: HTMLElement) {
  if (!(target instanceof Node)) {
    return null;
  }

  let current = target instanceof HTMLElement ? target : target.parentElement;

  while (current && current.parentElement !== editorRoot) {
    current = current.parentElement;
  }

  if (!current || current.parentElement !== editorRoot) {
    return null;
  }

  return current;
}

function getHoveredBlockFromPointer(
  editor: Editor,
  editorRoot: HTMLElement,
  container: HTMLElement,
  clientY: number,
) {
  const blocks = Array.from(editorRoot.children).filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );

  const matchedBlock =
    blocks.find((block) => {
      const bounds = block.getBoundingClientRect();
      return clientY >= bounds.top && clientY <= bounds.bottom;
    }) ??
    blocks.find((block, index) => {
      const bounds = block.getBoundingClientRect();
      const nextTop =
        blocks[index + 1]?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      return clientY >= bounds.bottom && clientY <= nextTop;
    });

  if (!matchedBlock) {
    return null;
  }

  let pos: number | null = null;

  try {
    pos = editor.view.posAtDOM(matchedBlock, 0);
  } catch {
    pos = null;
  }

  if (pos == null) {
    return null;
  }

  const blockBounds = matchedBlock.getBoundingClientRect();
  const containerBounds = container.getBoundingClientRect();

  return {
    height: blockBounds.height,
    pos,
    top: blockBounds.top - containerBounds.top,
  };
}

function getSlashContext(editor: Editor): SlashContext | null {
  const { selection } = editor.state;

  if (!selection.empty) {
    return null;
  }

  const { $from } = selection;

  if (!$from.parent.isTextblock) {
    return null;
  }

  const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
  const match = textBefore.match(/(?:^|\s)\/([^\s/]*)$/);

  if (!match) {
    return null;
  }

  const query = match[1] ?? "";
  const slashOffset = textBefore.lastIndexOf(`/${query}`);

  if (slashOffset < 0) {
    return null;
  }

  return {
    from: $from.start() + slashOffset,
    to: selection.from,
    query,
  };
}

function getAccessPermission(
  state: SyntextState,
  user: User,
  document: DocumentRecord,
) {
  const workspace = state.workspaces.find(
    (item) => item.id === document.workspaceId,
  );

  if (workspace?.ownerUserId === user.id) {
    return "owner" as const;
  }

  return (
    state.accesses.find(
      (access) => access.documentId === document.id && access.userId === user.id,
    )?.permission ?? null
  );
}

function getAccessEntries(
  state: SyntextState,
  document: DocumentRecord,
  currentWorkspaceUserIds: Set<string>,
) {
  const workspace = state.workspaces.find((item) => item.id === document.workspaceId);
  const owner = state.users.find((user) => user.id === workspace?.ownerUserId);

  const guestEntries = state.accesses
    .filter(
      (access) =>
        access.documentId === document.id && currentWorkspaceUserIds.has(access.userId),
    )
    .map<AccessEntry | null>((access) => {
      const user = state.users.find((item) => item.id === access.userId);

      if (!user) {
        return null;
      }

      return {
        email: user.email,
        id: user.id,
        name: user.name,
        permission: access.permission,
        userId: user.id,
      } satisfies AccessEntry;
    })
    .filter((entry): entry is AccessEntry => Boolean(entry))
    .sort((left, right) => left.name.localeCompare(right.name, "en"));

  return [
    ...(owner
      ? [
          {
            id: owner.id,
            email: owner.email,
            name: owner.name,
            permission: "owner" as const,
            userId: owner.id,
          },
        ]
      : []),
    ...guestEntries,
  ];
}

function permissionLabel(permission: "owner" | "can_edit" | "can_view") {
  if (permission === "owner") {
    return "Owner";
  }

  if (permission === "can_edit") {
    return "Can edit";
  }

  return "Can view";
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toEditorContent(content: string) {
  if (!content.trim()) {
    return "<p></p>";
  }

  if (content.trimStart().startsWith("<")) {
    return content;
  }

  return content
    .split("\n")
    .map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`)
    .join("");
}

function EditorSurface({
  document,
  permission,
  saveDocument,
}: EditorSurfaceProps) {
  const router = useRouter();
  const {
    currentUser,
    currentWorkspace,
    moveDocumentToTrash,
    shareDocument,
    state,
    updateDocumentAccess,
    removeDocumentAccess,
  } = useAppState();
  const blockMenuWidth = 208;
  const blockControlsRef = useRef<HTMLDivElement | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const blockMenuRef = useRef<HTMLDivElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchMenuRef = useRef<HTMLDivElement | null>(null);
  const overflowButtonRef = useRef<HTMLButtonElement | null>(null);
  const overflowMenuRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const permissionButtonRef = useRef<HTMLButtonElement | null>(null);
  const permissionMenuRef = useRef<HTMLDivElement | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const slashContextRef = useRef<SlashContext | null>(null);
  const filteredSlashItemsRef = useRef<SlashItem[]>([]);
  const [titleDraft, setTitleDraft] = useState(document.title);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<HoveredBlock | null>(null);
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  const [searchMatchIndex, setSearchMatchIndex] = useState(-1);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [searchRects, setSearchRects] = useState<SearchRect[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [permissionMenuOpen, setPermissionMenuOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<"can_edit" | "can_view">(
    "can_view",
  );
  const [slashContextState, setSlashContextState] = useState<SlashContext | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [blockMenu, setBlockMenu] = useState<{
    left: number;
    open: boolean;
    pos: number | null;
    showTurnInto: boolean;
    top: number;
  }>({
    left: 0,
    open: false,
    pos: null,
    showTurnInto: false,
    top: 0,
  });
  const [slashMenu, setSlashMenu] = useState<{
    activeIndex: number;
    left: number;
    open: boolean;
    query: string;
    top: number;
    placement: "above" | "below";
  }>({
    activeIndex: 0,
    left: 0,
    open: false,
    query: "",
    top: 0,
    placement: "below",
  });
  const slashMenuRef = useRef(slashMenu);
  const canEditTitle = permission === "owner";
  const canEditBody = permission === "owner" || permission === "can_edit";
  const canManageAccess = permission === "owner";
  const currentWorkspaceUserIds = useMemo(
    () =>
      new Set(
        state.users
          .filter(
            (user) =>
              currentWorkspace &&
              (currentWorkspace.ownerUserId === user.id ||
                state.accesses.some((access) => {
                  const accessDocument = state.documents.find(
                    (item) => item.id === access.documentId,
                  );

                  return (
                    access.userId === user.id &&
                    accessDocument?.workspaceId === currentWorkspace.id &&
                    accessDocument.status !== "trashed"
                  );
                })),
          )
          .map((user) => user.id),
      ),
    [currentWorkspace, state.accesses, state.documents, state.users],
  );
  const accessEntries = useMemo(
    () => getAccessEntries(state, document, currentWorkspaceUserIds),
    [currentWorkspaceUserIds, document, state],
  );
  const sharedAvatars = accessEntries.slice(0, 4);

  useEffect(() => {
    slashMenuRef.current = slashMenu;
  }, [slashMenu]);

  useEffect(() => {
    if (!searchMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (searchButtonRef.current?.contains(target) || searchMenuRef.current?.contains(target)) {
        return;
      }

      setSearchMenuOpen(false);
    }

    globalThis.document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      globalThis.document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [searchMenuOpen]);

  useEffect(() => {
    if (!permissionMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        permissionButtonRef.current?.contains(target) ||
        permissionMenuRef.current?.contains(target)
      ) {
        return;
      }

      setPermissionMenuOpen(false);
    }

    globalThis.document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      globalThis.document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [permissionMenuOpen]);

  useEffect(() => {
    if (!overflowMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        overflowButtonRef.current?.contains(target) ||
        overflowMenuRef.current?.contains(target)
      ) {
        return;
      }

      setOverflowMenuOpen(false);
    }

    globalThis.document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      globalThis.document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [overflowMenuOpen]);

  useEffect(() => {
    if (!searchMenuOpen) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [searchMenuOpen]);

  useEffect(() => {
    if (!blockMenu.open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (blockMenuRef.current?.contains(target)) {
        return;
      }

      setBlockMenu({
        left: 0,
        open: false,
        pos: null,
        showTurnInto: false,
        top: 0,
      });
    }

    globalThis.document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      globalThis.document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [blockMenu.open]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
    ],
    content: toEditorContent(document.content),
    editable: canEditBody,
    editorProps: {
      attributes: {
        class:
          "syntext-editor min-h-[60vh] max-w-none pl-6 outline-none text-base leading-8 text-[var(--color-foreground)]",
      },
      handleKeyDown: (_view, event) => {
        if (!slashMenuRef.current.open) {
          return false;
        }

        const enabledItems = filteredSlashItemsRef.current.filter((item) => item.enabled);

        if (!enabledItems.length) {
          return false;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSlashMenu((current) => ({
            ...current,
            activeIndex: (current.activeIndex + 1) % enabledItems.length,
          }));
          return true;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSlashMenu((current) => ({
            ...current,
            activeIndex:
              (current.activeIndex - 1 + enabledItems.length) % enabledItems.length,
          }));
          return true;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          const item = enabledItems[slashMenu.activeIndex] ?? enabledItems[0];
          const slashContext = slashContextRef.current;
          const currentEditor = editor;

          if (!item || !slashContext || !currentEditor) {
            return true;
          }

          currentEditor
            ?.chain()
            .focus()
            .deleteRange({ from: slashContext.from, to: slashContext.to })
            .run();
          item.run(currentEditor);
          setSlashMenu((current) => ({
            ...current,
            activeIndex: 0,
            open: false,
            placement: "below",
            query: "",
          }));
          return true;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          setSlashMenu((current) => ({
            ...current,
            activeIndex: 0,
            open: false,
            placement: "below",
            query: "",
          }));
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (!canEditBody) {
        return;
      }

      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      setStatus("saving");
      saveTimeoutRef.current = window.setTimeout(async () => {
        const result = await saveDocument(document.id, {
          content: currentEditor.getHTML(),
        });

        if (!result.ok) {
          setStatus("error");
          return;
        }

        setStatus("saved");
        window.setTimeout(() => {
          setStatus("idle");
        }, 1200);
      }, 500);
    },
  });

  useEffect(() => {
    if (!editor || !blockMenu.open || blockMenu.pos == null) {
      return;
    }

    const domNode = editor.view.nodeDOM(blockMenu.pos);

    if (!(domNode instanceof HTMLElement)) {
      return;
    }

    domNode.classList.add("is-active-block");

    return () => {
      domNode.classList.remove("is-active-block");
    };
  }, [blockMenu.open, blockMenu.pos, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(canEditBody);
  }, [canEditBody, editor]);

  const slashItems = useMemo<SlashItem[]>(
    () => [
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
    ],
    [],
  );

  const filteredSlashItems = useMemo(() => {
    const normalizedQuery = slashMenu.query.trim().toLowerCase();

    if (!normalizedQuery) {
      return slashItems;
    }

    return slashItems.filter(
      (item) =>
        item.label.toLowerCase().includes(normalizedQuery) ||
        item.shortcut.toLowerCase().includes(normalizedQuery),
    );
  }, [slashItems, slashMenu.query]);

  const enabledSlashItems = useMemo(
    () => filteredSlashItems.filter((item) => item.enabled),
    [filteredSlashItems],
  );

  const blockTransformItems = useMemo<BlockTransformItem[]>(
    () => [
      {
        id: "paragraph",
        label: "Text",
        run: (currentEditor, pos) => {
          setSelectionToBlock(currentEditor, pos);
          unwrapListIfNeeded(currentEditor);
          currentEditor.chain().focus().setParagraph().run();
        },
      },
      {
        id: "heading-1",
        label: "Heading 1",
        run: (currentEditor, pos) => {
          setSelectionToBlock(currentEditor, pos);
          unwrapListIfNeeded(currentEditor);
          currentEditor.chain().focus().setHeading({ level: 1 }).run();
        },
      },
      {
        id: "heading-2",
        label: "Heading 2",
        run: (currentEditor, pos) => {
          setSelectionToBlock(currentEditor, pos);
          unwrapListIfNeeded(currentEditor);
          currentEditor.chain().focus().setHeading({ level: 2 }).run();
        },
      },
      {
        id: "heading-3",
        label: "Heading 3",
        run: (currentEditor, pos) => {
          setSelectionToBlock(currentEditor, pos);
          unwrapListIfNeeded(currentEditor);
          currentEditor.chain().focus().setHeading({ level: 3 }).run();
        },
      },
      {
        id: "heading-4",
        label: "Heading 4",
        run: (currentEditor, pos) => {
          setSelectionToBlock(currentEditor, pos);
          unwrapListIfNeeded(currentEditor);
          currentEditor.chain().focus().setHeading({ level: 4 }).run();
        },
      },
      {
        id: "bullet-list",
        label: "Bulleted list",
        run: (currentEditor, pos) => {
          setSelectionToBlock(currentEditor, pos);
          currentEditor.chain().focus().toggleBulletList().run();
        },
      },
      {
        id: "ordered-list",
        label: "Numbered list",
        run: (currentEditor, pos) => {
          setSelectionToBlock(currentEditor, pos);
          currentEditor.chain().focus().toggleOrderedList().run();
        },
      },
      {
        id: "quote",
        label: "Quote",
        run: (currentEditor, pos) => {
          setSelectionToBlock(currentEditor, pos);
          unwrapListIfNeeded(currentEditor);
          currentEditor.chain().focus().toggleBlockquote().run();
        },
      },
      {
        id: "code",
        label: "Code",
        run: (currentEditor, pos) => {
          setSelectionToBlock(currentEditor, pos);
          unwrapListIfNeeded(currentEditor);
          currentEditor.chain().focus().toggleCodeBlock().run();
        },
      },
    ],
    [],
  );

  useEffect(() => {
    filteredSlashItemsRef.current = filteredSlashItems;
  }, [filteredSlashItems]);

  useEffect(() => {
    if (!editor || !canEditBody) {
      return;
    }

    const syncSlashMenu = () => {
      if (!editor.isFocused) {
        slashContextRef.current = null;
        setSlashContextState(null);
        setSlashMenu((current) => ({
          ...current,
          activeIndex: 0,
          open: false,
          placement: "below",
          query: "",
        }));
        return;
      }

      const slashContext = getSlashContext(editor);

      if (!slashContext) {
        slashContextRef.current = null;
        setSlashContextState(null);
        setSlashMenu((current) => ({
          ...current,
          activeIndex: 0,
          open: false,
          placement: "below",
          query: "",
        }));
        return;
      }

      const container = editorContainerRef.current;

      if (!container) {
        return;
      }

      const coords = editor.view.coordsAtPos(editor.state.selection.from);
      const bounds = container.getBoundingClientRect();
      const estimatedMenuHeight = Math.min(filteredSlashItemsRef.current.length * 38 + 10, 260);
      const spaceBelow = window.innerHeight - coords.bottom;
      const placeAbove = spaceBelow < estimatedMenuHeight + 16 && coords.top > estimatedMenuHeight;
      const nextTop = placeAbove
        ? coords.top - bounds.top - estimatedMenuHeight - 10
        : coords.bottom - bounds.top + 10;
      const nextLeft = Math.max(
        12,
        Math.min(coords.left - bounds.left, bounds.width - 228),
      );

      slashContextRef.current = slashContext;
      setSlashContextState(slashContext);
      setSlashMenu((current) => ({
        activeIndex:
          current.query !== slashContext.query || !current.open ? 0 : current.activeIndex,
        left: nextLeft,
        open: true,
        placement: placeAbove ? "above" : "below",
        query: slashContext.query,
        top: Math.max(12, nextTop),
      }));
    };

    syncSlashMenu();
    editor.on("selectionUpdate", syncSlashMenu);
    editor.on("transaction", syncSlashMenu);
    editor.on("blur", syncSlashMenu);
    editor.on("focus", syncSlashMenu);

    return () => {
      editor.off("selectionUpdate", syncSlashMenu);
      editor.off("transaction", syncSlashMenu);
      editor.off("blur", syncSlashMenu);
      editor.off("focus", syncSlashMenu);
    };
  }, [canEditBody, editor]);

  useEffect(() => {
    if (!editor || !canEditBody) {
      return;
    }

    const container = editorContainerRef.current;
    const editorRoot = container?.querySelector(".ProseMirror");

    if (!(editorRoot instanceof HTMLElement) || !container) {
      return;
    }

    const syncHoveredBlock = (target: EventTarget | null, clientY?: number) => {
      if (target instanceof Node) {
        if (blockControlsRef.current?.contains(target) || blockMenuRef.current?.contains(target)) {
          return;
        }
      }

      if (typeof clientY === "number") {
        const hoveredBlockFromPointer = getHoveredBlockFromPointer(
          editor,
          editorRoot,
          container,
          clientY,
        );

        if (hoveredBlockFromPointer) {
          setHoveredBlock(hoveredBlockFromPointer);
          return;
        }
      }

      const blockElement = getTopLevelBlock(target, editorRoot);

      if (!blockElement) {
        setHoveredBlock(null);
        return;
      }

      let pos: number | null = null;

      try {
        pos = editor.view.posAtDOM(blockElement, 0);
      } catch {
        pos = null;
      }

      if (pos == null) {
        setHoveredBlock(null);
        return;
      }

      const blockBounds = blockElement.getBoundingClientRect();
      const containerBounds = container.getBoundingClientRect();

      setHoveredBlock({
        height: blockBounds.height,
        pos,
        top: blockBounds.top - containerBounds.top,
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      syncHoveredBlock(event.target, event.clientY);
    };

    const handlePointerLeave = () => {
      setHoveredBlock(null);
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [canEditBody, editor]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!canEditTitle || document.title.trim()) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [canEditTitle, document.id, document.title]);

  function syncHoveredBlockFromPos(position: number) {
    if (!editor) {
      return;
    }

    const container = editorContainerRef.current;
    const domNode = editor.view.nodeDOM(position);

    if (!(container instanceof HTMLElement) || !(domNode instanceof HTMLElement)) {
      return;
    }

    const blockBounds = domNode.getBoundingClientRect();
    const containerBounds = container.getBoundingClientRect();

    setHoveredBlock({
      height: blockBounds.height,
      pos: position,
      top: blockBounds.top - containerBounds.top,
    });
  }

  async function commitTitle() {
    if (!canEditTitle) {
      return;
    }

    const result = await saveDocument(document.id, { title: titleDraft });

    if (!result.ok) {
      setTitleError(result.error);
      setStatus("error");
      return;
    }

    setTitleDraft(result.document?.title ?? titleDraft);
    setTitleError(null);
    setStatus("saved");
    window.setTimeout(() => {
      setStatus("idle");
    }, 1200);
  }

  function handleInsertBlockBefore() {
    if (!editor || !hoveredBlock) {
      return;
    }

    setBlockMenu({
      left: 0,
      open: false,
      pos: null,
      showTurnInto: false,
      top: 0,
    });

    editor
      .chain()
      .focus()
      .insertContentAt(hoveredBlock.pos, {
        type: "paragraph",
        content: [{ type: "text", text: "/" }],
      })
      .setTextSelection(hoveredBlock.pos + 2)
      .run();
  }

  function handleDuplicateBlock() {
    if (!editor || blockMenu.pos == null) {
      return;
    }

    const node = editor.state.doc.nodeAt(blockMenu.pos);

    if (!node) {
      return;
    }

    const duplicatedPos = blockMenu.pos + node.nodeSize;

    editor
      .chain()
      .focus()
      .insertContentAt(duplicatedPos, node.toJSON())
      .run();

    setBlockMenu({
      left: 0,
      open: false,
      pos: null,
      showTurnInto: false,
      top: 0,
    });

    window.requestAnimationFrame(() => {
      syncHoveredBlockFromPos(duplicatedPos);
    });
  }

  function handleDeleteBlock() {
    if (!editor || blockMenu.pos == null) {
      return;
    }

    const node = editor.state.doc.nodeAt(blockMenu.pos);

    if (!node) {
      return;
    }

    editor
      .chain()
      .focus()
      .deleteRange({ from: blockMenu.pos, to: blockMenu.pos + node.nodeSize })
      .run();

    setBlockMenu({
      left: 0,
      open: false,
      pos: null,
      showTurnInto: false,
      top: 0,
    });
    setHoveredBlock(null);
  }

  function handleTurnInto(item: BlockTransformItem) {
    if (!editor || blockMenu.pos == null) {
      return;
    }

    item.run(editor, blockMenu.pos);
    setBlockMenu({
      left: 0,
      open: false,
      pos: null,
      showTurnInto: false,
      top: 0,
    });
    window.requestAnimationFrame(() => {
      syncHoveredBlockFromPos(blockMenu.pos ?? 0);
    });
  }

  const statusLabel =
    status === "saving"
      ? "Saving..."
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Save failed"
          : null;
  const currentTransformActiveId =
    editor && blockMenu.pos != null ? getBlockTransformActiveId(editor, blockMenu.pos) : null;
  const canUndo = Boolean(editor?.can().chain().focus().undo().run());
  const guestBadgeClass =
    "rounded-full border border-[#f0d9a7] bg-[#fbefcf] px-2 py-0.5 text-[11px] font-semibold text-[#c98a10]";
  const searchHeaderLabel =
    searchNotice === "No match found"
      ? "No match found"
      : searchMatchIndex >= 0
        ? `${searchMatchIndex + 1} / ${searchMatchCount}`
        : "";
  function runSearch(direction: "forward" | "backward") {
    const query = searchQuery.trim();

    if (!query) {
      setSearchRects([]);
      setSearchMatchCount(0);
      setSearchMatchIndex(-1);
      setSearchNotice("Enter text to search");
      return;
    }

    const container = editorContainerRef.current;
    const editorRoot = container?.querySelector(".ProseMirror");

    if (!(editorRoot instanceof HTMLElement) || !(container instanceof HTMLElement)) {
      setSearchRects([]);
      setSearchMatchCount(0);
      setSearchNotice("No match found");
      return;
    }

    const matches = collectSearchMatches(editorRoot, query);

    if (!matches.length) {
      setSearchRects([]);
      setSearchMatchCount(0);
      setSearchMatchIndex(-1);
      setSearchNotice("No match found");
      return;
    }

    const nextIndex =
      searchMatchIndex < 0
        ? direction === "forward"
          ? 0
          : matches.length - 1
        : direction === "forward"
          ? (searchMatchIndex + 1) % matches.length
          : (searchMatchIndex - 1 + matches.length) % matches.length;
    const nextMatch = matches[nextIndex];
    const nextRects = getSearchRects(nextMatch.range, container);

    setSearchRects(nextRects);
    setSearchMatchCount(matches.length);
    setSearchMatchIndex(nextIndex);
    setSearchNotice(null);
    nextMatch.range.startContainer.parentElement?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      const length = searchInputRef.current?.value.length ?? 0;
      searchInputRef.current?.setSelectionRange(length, length);
    });
  }

  async function handleExportMarkdown() {
    const html = editor?.getHTML() ?? document.content;
    const markdown = editorHtmlToMarkdown(html);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = globalThis.document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = sanitizeMarkdownFilename(document.title);
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
    setActionError(null);
    setActionNotice("Markdown exported");
  }

  async function handleImportMarkdown(file: File) {
    if (!canEditBody) {
      setActionError("You do not have permission to import");
      setActionNotice(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".md")) {
      setActionError("Only .md files are supported right now");
      setActionNotice(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setActionError("上传文件过大");
      setActionNotice(null);
      return;
    }

    const markdown = await file.text();
    const html = markdownToEditorHtml(markdown);

    if (!editor) {
      setActionError("Editor is not ready");
      setActionNotice(null);
      return;
    }

    editor.chain().focus().insertContent(html).run();
    const result = await saveDocument(document.id, { content: editor.getHTML() });

    if (!result.ok) {
      setActionError(result.error);
      setActionNotice(null);
      return;
    }

    setActionError(null);
    setActionNotice("Markdown imported");
  }

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        event.stopPropagation();
        setSearchMenuOpen((current) => !current);
        setOverflowMenuOpen(false);
        setPermissionMenuOpen(false);
        return;
      }

      if (event.key === "Escape" && searchMenuOpen) {
        event.preventDefault();
        event.stopPropagation();
        setSearchMenuOpen(false);
        return;
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "z" &&
        !isEditableTarget &&
        canUndo
      ) {
        event.preventDefault();
        editor?.chain().focus().undo().run();
      }
    }

    globalThis.document.addEventListener("keydown", handleShortcut);

    return () => {
      globalThis.document.removeEventListener("keydown", handleShortcut);
    };
  }, [canUndo, editor, searchMenuOpen]);

  return (
    <div className="flex min-h-full flex-col bg-[linear-gradient(180deg,#ffffff_0%,#fdfcfb_100%)]">
      <div className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[rgba(255,255,255,0.94)] px-4 py-4 backdrop-blur-md">
        <div className="flex w-full flex-col">
          <div className="flex items-start justify-between gap-6">
            <div className="inline-flex max-w-full items-center gap-2">
              <div className="relative max-w-[min(100%,48rem)]">
                <span
                  aria-hidden="true"
                  className="invisible block whitespace-pre border-none bg-transparent px-0 text-[1.35rem] font-semibold tracking-[-0.028em] md:text-[1.55rem]"
                >
                  {titleDraft || "Untitled"}
                </span>
                <input
                  className="absolute inset-0 w-full border-none bg-transparent px-0 text-[1.35rem] font-semibold tracking-[-0.028em] outline-none placeholder:text-[var(--color-muted-foreground)] disabled:cursor-default md:text-[1.55rem]"
                  disabled={!canEditTitle}
                  onBlur={() => {
                    void commitTitle();
                  }}
                  onChange={(event) => {
                    setTitleDraft(event.target.value);
                    setTitleError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") {
                      return;
                    }

                    event.preventDefault();
                    void commitTitle();
                    editor?.commands.focus("end");
                  }}
                  placeholder="Untitled"
                  ref={titleInputRef}
                  value={titleDraft}
                />
              </div>
              {statusLabel ? (
                <div className="shrink-0 border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-2 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
                  {statusLabel}
                </div>
              ) : (
                <div className="invisible shrink-0 border border-[var(--color-border)] px-2 py-1 text-xs font-medium">
                  Saved
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <EditorPermissionPopover
                accessEntries={accessEntries}
                canManageAccess={canManageAccess}
                currentUserId={currentUser?.id}
                documentStatus={document.status}
                guestBadgeClass={guestBadgeClass}
                onCloseOtherMenus={() => {
                  setActionError(null);
                  setActionNotice(null);
                  setSearchMenuOpen(false);
                  setOverflowMenuOpen(false);
                }}
                onPermissionMenuToggle={setPermissionMenuOpen}
                onRemoveAccess={async (userId) => {
                  setPermissionBusy(true);
                  setPermissionError(null);
                  setPermissionNotice(null);
                  const result = await removeDocumentAccess(document.id, userId);
                  setPermissionBusy(false);

                  if (!result.ok) {
                    setPermissionError(result.error);
                    return;
                  }

                  setPermissionNotice("Access removed");
                }}
                onShareEmailChange={setShareEmail}
                onSharePermissionChange={setSharePermission}
                onShareSubmit={async (event) => {
                  event.preventDefault();
                  setPermissionBusy(true);
                  setPermissionError(null);
                  setPermissionNotice(null);

                  const result = await shareDocument(document.id, {
                    email: shareEmail,
                    permission: sharePermission,
                  });

                  setPermissionBusy(false);

                  if (!result.ok) {
                    setPermissionError(result.error);
                    return;
                  }

                  setShareEmail("");
                  setSharePermission("can_view");
                  setPermissionNotice("Guest added");
                }}
                onUpdateAccess={async (userId, nextPermission) => {
                  setPermissionBusy(true);
                  setPermissionError(null);
                  setPermissionNotice(null);
                  const result = await updateDocumentAccess(
                    document.id,
                    userId,
                    nextPermission,
                  );
                  setPermissionBusy(false);

                  if (!result.ok) {
                    setPermissionError(result.error);
                    return;
                  }

                  setPermissionNotice("Permission updated");
                }}
                permissionBusy={permissionBusy}
                permissionButtonRef={permissionButtonRef}
                permissionError={permissionError}
                permissionLabel={permissionLabel}
                permissionMenuOpen={permissionMenuOpen}
                permissionMenuRef={permissionMenuRef}
                permissionNotice={permissionNotice}
                PermissionDropdown={EditorPermissionDropdown}
                setPermissionError={setPermissionError}
                setPermissionNotice={setPermissionNotice}
                shareEmail={shareEmail}
                sharePermission={sharePermission}
                sharedAvatars={sharedAvatars}
              />

              <EditorSearchPopover
                onCloseOtherMenus={() => {
                  setActionError(null);
                  setActionNotice(null);
                  setOverflowMenuOpen(false);
                  setPermissionMenuOpen(false);
                }}
                onNext={() => {
                  runSearch("forward");
                }}
                onPrevious={() => {
                  runSearch("backward");
                }}
                onSearchChange={(value) => {
                  setSearchRects([]);
                  setSearchMatchCount(0);
                  setSearchMatchIndex(-1);
                  setSearchNotice(null);
                  setSearchQuery(value);
                }}
                open={searchMenuOpen}
                searchButtonRef={searchButtonRef}
                searchHeaderLabel={searchHeaderLabel}
                searchInputRef={searchInputRef}
                searchMenuRef={searchMenuRef}
                searchNotice={searchNotice}
                searchQuery={searchQuery}
                setOpen={setSearchMenuOpen}
              />

              <EditorOverflowMenu
                actionError={actionError}
                actionNotice={actionNotice}
                canEditBody={canEditBody}
                canUndo={canUndo}
                onExport={() => {
                  void handleExportMarkdown();
                }}
                onImport={() => {
                  importInputRef.current?.click();
                }}
                onMoveToTrash={async () => {
                  const result = await moveDocumentToTrash(document.id);

                  if (!result.ok) {
                    setActionError(result.error);
                    setActionNotice(null);
                    return;
                  }

                  setOverflowMenuOpen(false);
                  router.push("/home");
                }}
                onOpenChange={(next) => {
                  setOverflowMenuOpen(next);
                  setSearchMenuOpen(false);
                  setPermissionMenuOpen(false);
                }}
                onResetMessages={() => {
                  setActionError(null);
                  setActionNotice(null);
                }}
                onUndo={() => {
                  editor?.chain().focus().undo().run();
                }}
                overflowButtonRef={overflowButtonRef}
                overflowMenuOpen={overflowMenuOpen}
                overflowMenuRef={overflowMenuRef}
                permission={permission}
              />
            </div>
          </div>
          {titleError ? (
            <p className="mt-2 text-sm text-[#dd5b00]">{titleError}</p>
          ) : null}

          <EditorToolbar canEditBody={canEditBody} editor={editor} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-10 py-8">
        <input
          accept=".md,text/markdown"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (!file) {
              return;
            }

            void handleImportMarkdown(file);
            event.currentTarget.value = "";
          }}
          ref={importInputRef}
          type="file"
        />
        <div className="relative" ref={editorContainerRef}>
          {searchRects.map((rect, index) => (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute z-[1] bg-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
              key={`${rect.left}-${rect.top}-${index}`}
              style={{
                height: `${rect.height}px`,
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
              }}
            />
          ))}
          <EditorBlockControls
            blockControlsRef={blockControlsRef}
            blockMenuWidth={blockMenuWidth}
            canEditBody={canEditBody}
            hoveredBlock={hoveredBlock}
            onInsertBlockBefore={handleInsertBlockBefore}
            onOpenBlockMenu={setBlockMenu}
          />
          <EditorContent editor={editor} />
          {canEditBody && blockMenu.open && globalThis.document?.body
            ? createPortal(
                <EditorBlockMenu
                  blockMenuLeft={blockMenu.left}
                  blockMenuOpen={blockMenu.open}
                  blockMenuRef={blockMenuRef}
                  blockMenuTop={blockMenu.top}
                  blockTransformItems={blockTransformItems}
                  canEditBody={canEditBody}
                  currentTransformActiveId={currentTransformActiveId}
                  handleDeleteBlock={handleDeleteBlock}
                  handleDuplicateBlock={handleDuplicateBlock}
                  handleTurnInto={handleTurnInto}
                  setBlockMenu={setBlockMenu}
                  showTurnInto={blockMenu.showTurnInto}
                />,
                globalThis.document.body,
              )
            : null}
          <EditorSlashMenu
            activeIndex={slashMenu.activeIndex}
            editor={editor}
            enabledItems={enabledSlashItems}
            filteredItems={filteredSlashItems}
            onActivateItem={(nextIndex) => {
              setSlashMenu((current) => ({
                ...current,
                activeIndex: nextIndex,
              }));
            }}
            onClose={() => {
              setSlashMenu((current) => ({
                ...current,
                activeIndex: 0,
                open: false,
                query: "",
              }));
            }}
            open={canEditBody && slashMenu.open}
            position={{
              left: slashMenu.left,
              top: slashMenu.top,
            }}
            slashContext={slashContextState}
          />
        </div>
      </div>
    </div>
  );
}

export function DocumentEditorShell({ documentId }: DocumentEditorShellProps) {
  const router = useRouter();
  const openedDocumentIdRef = useRef<string | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useLocale();
  const {
    currentUser,
    currentWorkspace,
    getDocument,
    openDocument,
    ready,
    saveDocument,
    state,
  } = useAppState();
  const rawDocument =
    state.documents.find((item) => item.id === documentId) ?? null;
  const document = getDocument(documentId);
  const permission = useMemo(() => {
    if (!currentUser || !rawDocument) {
      return null;
    }

    return getAccessPermission(state, currentUser, rawDocument);
  }, [currentUser, rawDocument, state]);

  useEffect(() => {
    openedDocumentIdRef.current = null;

    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
  }, [documentId]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!ready || !currentUser) {
      return;
    }

    if (rawDocument?.status === "trashed") {
      return;
    }

    if (rawDocument && !permission) {
      redirectTimeoutRef.current = setTimeout(() => {
        router.replace("/home");
      }, 1400);
      return;
    }

    if (openedDocumentIdRef.current === documentId) {
      return;
    }

    void (async () => {
      const result = await openDocument(documentId);

      if (!result.ok) {
        redirectTimeoutRef.current = setTimeout(() => {
          router.replace("/home");
        }, 1400);
        return;
      }

      openedDocumentIdRef.current = documentId;
    })();
  }, [currentUser, documentId, openDocument, permission, rawDocument, ready, router]);

  if (!ready || !currentUser) {
    return null;
  }

  if (rawDocument?.status === "trashed") {
    return (
      <DocumentStatusState
        description={t("deletedDescription")}
        title={t("deletedTitle")}
      />
    );
  }

  if (rawDocument && !permission) {
    return (
      <DocumentStatusState
        description={t("noAccessNotice")}
        title={t("noAccessTitle")}
      />
    );
  }

  if (!document || !currentWorkspace || !permission) {
    return null;
  }

  return (
    <EditorSurface
      document={document}
      key={document.id}
      permission={permission}
      saveDocument={saveDocument}
    />
  );
}
