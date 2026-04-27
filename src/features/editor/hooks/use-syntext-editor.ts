"use client";

import { useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import type * as Y from "yjs";
import { useEffect, useRef, useState } from "react";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { NodeSelection } from "@tiptap/pm/state";
import type { User } from "@/features/app-state/types";
import { TableOfContents } from "@/features/editor/extensions/table-of-contents";
import { syntextLowlight } from "@/features/editor/lib/code-highlighting";
import { toEditorContent } from "@/features/editor/lib/content";
import { insertImageFile } from "@/features/editor/lib/image";

type SaveDocument = (
  documentId: string,
  patch: { content?: string; title?: string },
) => Promise<
  { error: string; ok: false } | { ok: true; document: { title: string } | null }
>;

type UseSyntextEditorArgs = {
  canEditBody: boolean;
  collaborationDocument: Y.Doc | null;
  collaborationProvider: HocuspocusProvider | null;
  collaborationSynced: boolean;
  content: string;
  currentUser: User | null;
  documentId: string;
  onEditorKeyDown: (event: KeyboardEvent) => boolean;
  saveDocument: SaveDocument;
  setStatus: (value: "idle" | "saving" | "saved" | "error") => void;
};

export function useSyntextEditor({
  canEditBody,
  collaborationDocument,
  collaborationProvider,
  collaborationSynced,
  content,
  currentUser,
  documentId,
  onEditorKeyDown,
  saveDocument,
  setStatus,
}: UseSyntextEditorArgs) {
  const editorRef = useRef<Editor | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const seededInitialContentRef = useRef(false);
  const [editorReadyVersion, setEditorReadyVersion] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ...(collaborationDocument
        ? [
            Collaboration.configure({
              document: collaborationDocument,
              field: "default",
            }),
            ...(collaborationProvider && currentUser
              ? [
                  CollaborationCaret.configure({
                    provider: collaborationProvider,
                    user: {
                      avatarUrl: currentUser.avatarUrl,
                      color: "#2383e2",
                      name: currentUser.name,
                      userId: currentUser.id,
                    },
                    render: (user) => {
                      const caret = document.createElement("span");
                      caret.className = "collaboration-carets__caret";
                      caret.style.borderColor = user.color;

                      const label = document.createElement("div");
                      label.className = "collaboration-carets__label";
                      label.style.backgroundColor = user.color;
                      label.textContent = user.name;
                      caret.append(label);
                      return caret;
                    },
                    selectionRender: (user) => ({
                      class: "collaboration-carets__selection",
                      style: `background-color: ${user.color}22`,
                    }),
                  }),
                ]
              : []),
          ]
        : []),
      Image.configure({
        allowBase64: true,
        inline: false,
      }),
      Link.configure({
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
        linkOnPaste: true,
        openOnClick: false,
      }),
      CodeBlockLowlight.configure({
        defaultLanguage: null,
        lowlight: syntextLowlight,
      }),
      TaskList,
      TaskItem.configure({
        nested: false,
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TableOfContents,
      StarterKit.configure({
        codeBlock: false,
        heading: {
          levels: [1, 2, 3, 4],
        },
        link: false,
        undoRedo: collaborationDocument ? false : undefined,
      }),
    ],
    content: collaborationDocument ? undefined : toEditorContent(content),
    editable: canEditBody,
    editorProps: {
      attributes: {
        class:
          "syntext-editor min-h-[60vh] max-w-none pl-6 outline-none text-base leading-8 text-[var(--color-foreground)]",
      },
      handleClickOn: (_view, _pos, node, nodePos, event, direct) => {
        if (!canEditBody || !direct || node.type.name !== "image") {
          return false;
        }

        event.preventDefault();
        const currentEditor = editorRef.current;

        if (!currentEditor) {
          return true;
        }

        const selection = NodeSelection.create(currentEditor.state.doc, nodePos);
        const transaction = currentEditor.state.tr.setSelection(selection);
        currentEditor.view.dispatch(transaction);
        currentEditor.commands.focus();
        return true;
      },
      handleClick: (_view, _pos, event) => {
        const link = (event.target as HTMLElement | null)?.closest("a[href]");

        if (!(link instanceof HTMLAnchorElement)) {
          return false;
        }

        event.preventDefault();
        window.open(link.href, "_blank", "noopener,noreferrer");
        return true;
      },
      handleKeyDown: (_view, event) => {
        const currentEditor = editorRef.current;

        if (
          currentEditor &&
          canEditBody &&
          event.key === "Delete" &&
          isCursorInEmptyListItem(currentEditor)
        ) {
          event.preventDefault();
          return true;
        }

        return onEditorKeyDown(event);
      },
      handlePaste: (_view, event) => {
        if (!canEditBody) {
          return false;
        }

        const file = Array.from(event.clipboardData?.files ?? []).find((item) =>
          item.type.startsWith("image/"),
        );

        if (!file) {
          return false;
        }

        event.preventDefault();
        const currentEditor = editorRef.current;

        if (!currentEditor) {
          return true;
        }

        void insertImageFromFile(currentEditor, file);
        return true;
      },
      handleDrop: (_view, event) => {
        if (!canEditBody) {
          return false;
        }

        const file = Array.from(event.dataTransfer?.files ?? []).find((item) =>
          item.type.startsWith("image/"),
        );

        if (!file) {
          return false;
        }

        event.preventDefault();
        const currentEditor = editorRef.current;

        if (!currentEditor) {
          return true;
        }

        const dropPosition = currentEditor.view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        })?.pos;

        void insertImageFromFile(currentEditor, file, dropPosition);
        return true;
      },
    },
    onCreate: ({ editor: currentEditor }) => {
      editorRef.current = currentEditor;
      setEditorReadyVersion((current) => current + 1);
    },
    onDestroy: () => {
      editorRef.current = null;
      setEditorReadyVersion((current) => current + 1);
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
        const result = await saveDocument(documentId, {
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
  }, [canEditBody, collaborationDocument, collaborationProvider, currentUser?.id, documentId]);

  useEffect(() => {
    seededInitialContentRef.current = false;
  }, [content, documentId]);

  useEffect(() => {
    if (!editor || !collaborationDocument || !collaborationSynced) {
      return;
    }

    if (seededInitialContentRef.current) {
      return;
    }

    const fragment = collaborationDocument.getXmlFragment("default");
    const config = collaborationDocument.getMap("config");

    if (config.get("initialContentLoaded") || fragment.length > 0 || !content.trim()) {
      seededInitialContentRef.current = true;
      return;
    }

    seededInitialContentRef.current = true;
    let seedAttempted = false;
    const seedTimeoutId = window.setTimeout(() => {
      seedAttempted = true;

      if (editor.isDestroyed) {
        return;
      }

      if (config.get("initialContentLoaded") || fragment.length > 0) {
        return;
      }

      config.set("initialContentLoaded", true);
      editor.commands.setContent(toEditorContent(content), {
        emitUpdate: false,
      });
    }, 0);

    return () => {
      window.clearTimeout(seedTimeoutId);
      if (!seedAttempted) {
        seededInitialContentRef.current = false;
      }
    };
  }, [collaborationDocument, collaborationSynced, content, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(canEditBody);
  }, [canEditBody, editor]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    editor,
    editorReadyVersion,
    editorRef,
  };

  function insertImageFromFile(currentEditor: Editor, file: File, position?: number) {
    return insertImageFile(currentEditor, file, {
      position,
    }).then((result) => {
      if (!result.ok) {
        setStatus("error");
      }
    });
  }
}

function isCursorInEmptyListItem(editor: Editor) {
  const { selection } = editor.state;

  if (!selection.empty) {
    return false;
  }

  const { $from } = selection;

  if ($from.parent.textContent.trim().length > 0) {
    return false;
  }

  let itemDepth = -1;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);

    if (node.type.name === "listItem" || node.type.name === "taskItem") {
      itemDepth = depth;
      break;
    }
  }

  if (itemDepth < 0) {
    return false;
  }

  return true;
}
