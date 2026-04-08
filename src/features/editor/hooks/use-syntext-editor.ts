"use client";

import { useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
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
import { useEffect, useRef, useState } from "react";
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
  content: string;
  documentId: string;
  onEditorKeyDown: (event: KeyboardEvent) => boolean;
  saveDocument: SaveDocument;
  setStatus: (value: "idle" | "saving" | "saved" | "error") => void;
};

export function useSyntextEditor({
  canEditBody,
  content,
  documentId,
  onEditorKeyDown,
  saveDocument,
  setStatus,
}: UseSyntextEditorArgs) {
  const editorRef = useRef<Editor | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const [editorReadyVersion, setEditorReadyVersion] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
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
      }),
    ],
    content: toEditorContent(content),
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
  });

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
}
