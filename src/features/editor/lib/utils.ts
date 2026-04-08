import type { Editor } from "@tiptap/react";
import type { DocumentRecord, SyntextState, User } from "@/features/app-state/types";
import type { AccessEntry, HoveredBlock, SlashContext } from "@/features/editor/lib/types";

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

  return "paragraph";
}

export function setSelectionToBlock(editor: Editor, pos: number) {
  editor.chain().focus().setTextSelection(pos + 1).run();
}

export function unwrapListIfNeeded(editor: Editor) {
  if (editor.isActive("bulletList") || editor.isActive("orderedList")) {
    editor.chain().focus().liftListItem("listItem").run();
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
