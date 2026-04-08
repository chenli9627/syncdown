"use client";

import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import type {
  DocumentRecord,
} from "@/features/app-state/types";
import { useAppState } from "@/features/app-state/providers/app-state-provider";
import { EditorCanvas } from "@/features/editor/components/editor-canvas";
import { EditorHeader } from "@/features/editor/components/editor-header";
import { DocumentStatusState } from "@/features/editor/components/document-status-state";
import { useEditorActions } from "@/features/editor/hooks/use-editor-actions";
import { useDocumentShellState } from "@/features/editor/hooks/use-document-shell-state";
import {
  createBlockTransformItems,
  createSlashItems,
} from "@/features/editor/lib/menu-config";
import {
  type SearchRect,
} from "@/features/editor/lib/search";
import type {
  BlockTransformItem,
  HoveredBlock,
  SlashContext,
  SlashItem,
} from "@/features/editor/lib/types";
import {
  getAccessEntries,
  getHoveredBlockFromPointer,
  getSlashContext,
  getTopLevelBlock,
  permissionLabel,
} from "@/features/editor/lib/utils";

type DocumentEditorShellProps = {
  documentId: string;
};

type EditorSurfaceProps = {
  document: DocumentRecord;
  permission: "owner" | "can_edit" | "can_view";
  saveDocument: ReturnType<typeof useAppState>["saveDocument"];
};

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

  const slashItems = useMemo<SlashItem[]>(() => createSlashItems(), []);

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
    () => createBlockTransformItems(),
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

  const guestBadgeClass =
    "rounded-full border border-[#f0d9a7] bg-[#fbefcf] px-2 py-0.5 text-[11px] font-semibold text-[#c98a10]";
  const searchHeaderLabel =
    searchNotice === "No match found"
      ? "No match found"
      : searchMatchIndex >= 0
        ? `${searchMatchIndex + 1} / ${searchMatchCount}`
        : "";
  const {
    canUndo,
    currentTransformActiveId,
    handleDeleteBlock,
    handleDuplicateBlock,
    handleExportMarkdown,
    handleImportMarkdown,
    handleInsertBlockBefore,
    handleTurnInto,
    runSearch,
    statusLabel,
  } = useEditorActions({
    blockMenu,
    canEditBody,
    document,
    editor,
    editorContainerRef,
    hoveredBlock,
    saveDocument,
    searchInputRef,
    searchMatchIndex,
    searchQuery,
    setActionError,
    setActionNotice,
    setBlockMenu,
    setHoveredBlock,
    setSearchMatchCount,
    setSearchMatchIndex,
    setSearchNotice,
    setSearchRects,
    status,
    syncHoveredBlockFromPos,
  });

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
      <EditorHeader
        accessEntries={accessEntries}
        actionError={actionError}
        actionNotice={actionNotice}
        canEditBody={canEditBody}
        canEditTitle={canEditTitle}
        canManageAccess={canManageAccess}
        canUndo={canUndo}
        commitTitle={commitTitle}
        currentUserId={currentUser?.id}
        documentId={document.id}
        documentStatus={document.status}
        editor={editor}
        guestBadgeClass={guestBadgeClass}
        handleExportMarkdown={handleExportMarkdown}
        importInputRef={importInputRef}
        moveDocumentToTrash={moveDocumentToTrash}
        onSearchNext={() => {
          runSearch("forward");
        }}
        onSearchPrevious={() => {
          runSearch("backward");
        }}
        overflowButtonRef={overflowButtonRef}
        overflowMenuOpen={overflowMenuOpen}
        overflowMenuRef={overflowMenuRef}
        permission={permission}
        permissionBoldLabel={permissionLabel}
        permissionBusy={permissionBusy}
        permissionButtonRef={permissionButtonRef}
        permissionError={permissionError}
        permissionMenuOpen={permissionMenuOpen}
        permissionMenuRef={permissionMenuRef}
        permissionNotice={permissionNotice}
        removeDocumentAccess={removeDocumentAccess}
        routerPushHome={() => {
          router.push("/home");
        }}
        searchButtonRef={searchButtonRef}
        searchHeaderLabel={searchHeaderLabel}
        searchInputRef={searchInputRef}
        searchMenuOpen={searchMenuOpen}
        searchMenuRef={searchMenuRef}
        searchNotice={searchNotice}
        searchQuery={searchQuery}
        setActionError={setActionError}
        setActionNotice={setActionNotice}
        setOverflowMenuOpen={setOverflowMenuOpen}
        setPermissionBusy={setPermissionBusy}
        setPermissionError={setPermissionError}
        setPermissionMenuOpen={setPermissionMenuOpen}
        setPermissionNotice={setPermissionNotice}
        setSearchMatchCount={setSearchMatchCount}
        setSearchMatchIndex={setSearchMatchIndex}
        setSearchMenuOpen={setSearchMenuOpen}
        setSearchNotice={setSearchNotice}
        setSearchQuery={setSearchQuery}
        setSearchRects={setSearchRects as (value: []) => void}
        setShareEmail={setShareEmail}
        setSharePermission={setSharePermission}
        setTitleDraft={(value) => {
          setTitleDraft(value);
          setTitleError(null);
        }}
        shareDocument={shareDocument}
        shareEmail={shareEmail}
        sharePermission={sharePermission}
        sharedAvatars={sharedAvatars}
        statusLabel={statusLabel}
        titleDraft={titleDraft}
        titleError={titleError}
        titleInputRef={titleInputRef}
        updateDocumentAccess={updateDocumentAccess}
      />

      <EditorCanvas
        blockControlsRef={blockControlsRef}
        blockMenu={blockMenu}
        blockMenuRef={blockMenuRef}
        blockMenuWidth={blockMenuWidth}
        blockTransformItems={blockTransformItems}
        canEditBody={canEditBody}
        currentTransformActiveId={currentTransformActiveId}
        editor={editor}
        editorContainerRef={editorContainerRef}
        enabledSlashItems={enabledSlashItems}
        filteredSlashItems={filteredSlashItems}
        handleDeleteBlock={handleDeleteBlock}
        handleDuplicateBlock={handleDuplicateBlock}
        handleImportMarkdown={handleImportMarkdown}
        handleInsertBlockBefore={handleInsertBlockBefore}
        handleTurnInto={handleTurnInto}
        hoveredBlock={hoveredBlock}
        importInputRef={importInputRef}
        searchRects={searchRects}
        setBlockMenu={setBlockMenu}
        setSlashMenu={setSlashMenu}
        slashContextState={slashContextState}
        slashMenu={slashMenu}
      />
    </div>
  );
}

export function DocumentEditorShell({ documentId }: DocumentEditorShellProps) {
  const { t } = useLocale();
  const {
    currentUser,
    currentWorkspace,
    document,
    permission,
    rawDocument,
    ready,
    saveDocument,
  } = useDocumentShellState(documentId);

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
