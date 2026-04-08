import type { Editor } from "@tiptap/react";
import type { DocumentRecord, SyntextState, User } from "@/features/app-state/types";
import type {
  AccessEntry,
  BlockDragState,
  HoveredBlock,
  SlashContext,
} from "@/features/editor/lib/types";

export function getBlockTransformActiveId(editor: Editor, pos: number) {
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

  if (node.type.name === "image") {
    return "image";
  }

  return "paragraph";
}

export function setSelectionToBlock(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);

  if (!node) {
    editor.chain().focus().setTextSelection(pos + 1).run();
    return;
  }

  let selectionPos = pos + 1;
  let foundText = false;
  let textblockFallbackPos: number | null = null;

  node.descendants((child, offset) => {
    if (child.isText && (child.text?.length ?? 0) > 0) {
      selectionPos = pos + offset + 1;
      foundText = true;
      return false;
    }

    if (textblockFallbackPos == null && child.isTextblock) {
      textblockFallbackPos = pos + offset + 2;
    }

    return true;
  });

  if (!foundText && textblockFallbackPos != null) {
    selectionPos = textblockFallbackPos;
  }

  editor.chain().focus().setTextSelection(selectionPos).run();
}

export function unwrapListIfNeeded(editor: Editor) {
  if (editor.isActive("bulletList") || editor.isActive("orderedList")) {
    editor.chain().focus().liftListItem("listItem").run();
  }
}

export function unwrapQuoteIfNeeded(editor: Editor) {
  if (editor.isActive("blockquote")) {
    editor.chain().focus().toggleBlockquote().run();
  }
}

export function unwrapCodeBlockIfNeeded(editor: Editor) {
  if (editor.isActive("codeBlock")) {
    editor.chain().focus().toggleCodeBlock().run();
  }
}

export function normalizeParagraphTransform(editor: Editor) {
  unwrapListIfNeeded(editor);
  unwrapQuoteIfNeeded(editor);
  unwrapCodeBlockIfNeeded(editor);
}

export function normalizeListTransform(editor: Editor) {
  unwrapQuoteIfNeeded(editor);
  unwrapCodeBlockIfNeeded(editor);

  if (editor.isActive("bulletList")) {
    editor.chain().focus().toggleBulletList().run();
  }

  if (editor.isActive("orderedList")) {
    editor.chain().focus().toggleOrderedList().run();
  }
}

export function getTopLevelBlock(target: EventTarget | null, editorRoot: HTMLElement) {
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

export function getTopLevelBlockStartPos(editor: Editor, rawPos: number) {
  const resolvedPos = editor.state.doc.resolve(
    Math.max(0, Math.min(rawPos, editor.state.doc.content.size)),
  );

  return resolvedPos.depth >= 1 ? resolvedPos.before(1) : rawPos;
}

export function getTopLevelBlockInfoFromElement(
  editor: Editor,
  blockElement: HTMLElement,
  container: HTMLElement,
) {
  let rawPos: number | null = null;

  try {
    rawPos = editor.view.posAtDOM(blockElement, 0);
  } catch {
    rawPos = null;
  }

  if (rawPos == null) {
    return null;
  }

  const pos = getTopLevelBlockStartPos(editor, rawPos);
  const normalizedNode = editor.view.nodeDOM(pos);
  const normalizedElement =
    (normalizedNode instanceof HTMLElement ? normalizedNode : normalizedNode?.parentElement)?.closest(
      "p, h1, h2, h3, h4, blockquote, pre, li, hr, img",
    ) ?? blockElement;

  if (!(normalizedElement instanceof HTMLElement)) {
    return null;
  }

  const blockBounds = normalizedElement.getBoundingClientRect();
  const containerBounds = container.getBoundingClientRect();

  return {
    element: normalizedElement,
    height: blockBounds.height,
    left: blockBounds.left - containerBounds.left,
    pos,
    top: blockBounds.top - containerBounds.top,
    width: blockBounds.width,
  };
}

export function getHoveredBlockFromPointer(
  editor: Editor,
  editorRoot: HTMLElement,
  container: HTMLElement,
  clientY: number,
): HoveredBlock | null {
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

  const blockInfo = getTopLevelBlockInfoFromElement(editor, matchedBlock, container);

  if (!blockInfo) {
    return null;
  }

  return {
    height: blockInfo.height,
    pos: blockInfo.pos,
    top: blockInfo.top,
  };
}

export function getBlockDropTargetFromPointer(
  editor: Editor,
  editorRoot: HTMLElement,
  container: HTMLElement,
  clientY: number,
  draggedPos: number | null,
): Pick<BlockDragState, "dropPos" | "indicatorTop"> | null {
  const blocks = Array.from(editorRoot.children).filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );

  const candidates = blocks
    .map((block) => {
      const blockInfo = getTopLevelBlockInfoFromElement(editor, block, container);

      if (!blockInfo || (draggedPos != null && blockInfo.pos === draggedPos)) {
        return null;
      }

      const node = editor.state.doc.nodeAt(blockInfo.pos);

      if (!node) {
        return null;
      }

      return {
        bounds: blockInfo.element.getBoundingClientRect(),
        node,
        pos: blockInfo.pos,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (!candidates.length) {
    return null;
  }

  const containerBounds = container.getBoundingClientRect();

  for (const candidate of candidates) {
    const midpoint = candidate.bounds.top + candidate.bounds.height / 2;

    if (clientY < midpoint) {
      return {
        dropPos: candidate.pos,
        indicatorTop: candidate.bounds.top - containerBounds.top,
      };
    }
  }

  const lastCandidate = candidates.at(-1);

  if (!lastCandidate) {
    return null;
  }

  return {
    dropPos: lastCandidate.pos + lastCandidate.node.nodeSize,
    indicatorTop: lastCandidate.bounds.bottom - containerBounds.top,
  };
}

export function getSlashContext(editor: Editor): SlashContext | null {
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

export function getImageSourceAtPos(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);

  if (node?.type.name !== "image") {
    return null;
  }

  return typeof node.attrs.src === "string" ? node.attrs.src : null;
}

export function getAccessPermission(
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

export function getAccessEntries(
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
      const user = state.users.find((candidate) => candidate.id === access.userId);

      if (!user) {
        return null;
      }

      return {
        email: user.email,
        id: user.id,
        name: user.name,
        permission: access.permission,
        userId: user.id,
      };
    })
    .filter((entry): entry is AccessEntry => entry !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return [
    ...(owner
      ? [
          {
            email: owner.email,
            id: `owner-${owner.id}`,
            name: owner.name,
            permission: "owner" as const,
            userId: owner.id,
          },
        ]
      : []),
    ...guestEntries,
  ];
}

export function permissionLabel(permission: "owner" | "can_edit" | "can_view") {
  if (permission === "owner") {
    return "Owner";
  }

  if (permission === "can_edit") {
    return "Can edit";
  }

  return "Can view";
}
