"use client";

import { useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Image from "@tiptap/extension-image";
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
import type { User } from "@/features/app-state/types";
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
      StarterKit.configure({
        codeBlock: false,
        heading: {
          levels: [1, 2, 3, 4],
        },
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
      handleKeyDown: (_view, event) => {
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

        void insertImageFile(currentEditor, file).then((result) => {
          if (!result.ok) {
            setStatus("error");
          }
        });
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
    config.set("initialContentLoaded", true);
    editor.commands.setContent(toEditorContent(content), {
      emitUpdate: false,
    });
  }, [collaborationDocument, collaborationSynced, content, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(canEditBody);
  }, [canEditBody, editor]);

  useEffect(() => {
    if (!editor || !collaborationProvider || !currentUser) {
      return;
    }

    editor.commands.updateUser({
      avatarUrl: currentUser.avatarUrl,
      color: "#2383e2",
      name: currentUser.name,
      userId: currentUser.id,
    });
  }, [collaborationProvider, currentUser, editor]);

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
}
