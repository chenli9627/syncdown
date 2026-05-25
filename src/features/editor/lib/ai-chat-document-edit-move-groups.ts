import type { Editor } from "@tiptap/react";
import type {
  AiDocumentEditOperation,
  LocalAiDocumentBlock,
  OperationPlacement,
} from "@/features/editor/lib/ai-chat-document-edit-types";

export type ContiguousMoveOperationGroup = {
  operationIndexes: number[];
  placement: OperationPlacement;
  sourceEndBlock: LocalAiDocumentBlock;
  sourceStartBlock: LocalAiDocumentBlock;
  targetEndBlock: LocalAiDocumentBlock;
  targetStartBlock: LocalAiDocumentBlock;
};

type MoveCandidate = {
  operationIndex: number;
  placement: OperationPlacement;
  sourceBlock: LocalAiDocumentBlock;
  sourceIndex: number;
  targetBlock: LocalAiDocumentBlock;
  targetIndex: number;
};

export function getContiguousMoveOperationGroups(
  operations: AiDocumentEditOperation[],
  blocks: LocalAiDocumentBlock[],
): ContiguousMoveOperationGroup[] {
  const candidates = operations
    .map((operation, operationIndex) =>
      toMoveCandidate(operation, operationIndex, blocks),
    )
    .filter((candidate): candidate is MoveCandidate => Boolean(candidate));

  if (candidates.length < 2) {
    return [];
  }

  const placement = candidates[0]?.placement;

  if (!placement || candidates.some((candidate) => candidate.placement !== placement)) {
    return [];
  }

  const sourceSorted = [...candidates].sort((a, b) => a.sourceIndex - b.sourceIndex);

  if (!hasContiguousIndexes(sourceSorted.map((candidate) => candidate.sourceIndex))) {
    return [];
  }

  return (
    getSameTargetMoveGroup(sourceSorted, placement) ??
    getPairwiseContiguousMoveGroup(sourceSorted, placement) ??
    []
  );
}

export function applyContiguousMoveOperationGroup(
  editor: Editor,
  group: ContiguousMoveOperationGroup,
) {
  const from = group.sourceStartBlock.pos;
  const to = group.sourceEndBlock.pos + group.sourceEndBlock.nodeSize;
  const sourceSize = to - from;
  const targetPosition =
    group.placement === "before"
      ? group.targetStartBlock.pos
      : group.targetEndBlock.pos + group.targetEndBlock.nodeSize;

  if (targetPosition >= from && targetPosition <= to) {
    return false;
  }

  const before = JSON.stringify(editor.state.doc.toJSON());
  const movedContent = editor.state.doc.slice(from, to).content;
  const insertPosition = targetPosition > from ? targetPosition - sourceSize : targetPosition;
  const transaction = editor.state.tr.delete(from, to).insert(insertPosition, movedContent);

  editor.view.dispatch(transaction);
  editor.commands.focus();

  return JSON.stringify(editor.state.doc.toJSON()) !== before;
}

function toMoveCandidate(
  operation: AiDocumentEditOperation,
  operationIndex: number,
  blocks: LocalAiDocumentBlock[],
): MoveCandidate | null {
  if (operation.type !== "move_block" || !operation.targetBlockId) {
    return null;
  }

  const placement = operation.placement ?? "after";
  const sourceIndex = blocks.findIndex((block) => block.id === operation.blockId);
  const targetIndex = blocks.findIndex((block) => block.id === operation.targetBlockId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return null;
  }

  const sourceBlock = blocks[sourceIndex];
  const targetBlock = blocks[targetIndex];

  if (!sourceBlock || !targetBlock) {
    return null;
  }

  return {
    operationIndex,
    placement,
    sourceBlock,
    sourceIndex,
    targetBlock,
    targetIndex,
  };
}

function getSameTargetMoveGroup(
  sourceSorted: MoveCandidate[],
  placement: OperationPlacement,
) {
  const targetIndex = sourceSorted[0]?.targetIndex;

  if (
    targetIndex == null ||
    sourceSorted.some((candidate) => candidate.targetIndex !== targetIndex)
  ) {
    return null;
  }

  const target = sourceSorted[0]?.targetBlock;

  if (!target || sourceSorted.some((candidate) => candidate.sourceIndex === targetIndex)) {
    return null;
  }

  return toContiguousMoveOperationGroup(
    sourceSorted,
    placement,
    sourceSorted[0]?.targetBlock,
    sourceSorted[0]?.targetBlock,
  );
}

function getPairwiseContiguousMoveGroup(
  sourceSorted: MoveCandidate[],
  placement: OperationPlacement,
) {
  const targetSorted = [...sourceSorted].sort((a, b) => a.targetIndex - b.targetIndex);
  const sourceIndexes = sourceSorted.map((candidate) => candidate.sourceIndex);
  const targetIndexes = targetSorted.map((candidate) => candidate.targetIndex);

  if (
    sourceIndexes.length !== targetIndexes.length ||
    !hasContiguousIndexes(targetIndexes) ||
    !hasConstantPairwiseOffset(sourceSorted)
  ) {
    return null;
  }

  const sourceStartIndex = sourceIndexes[0];
  const sourceEndIndex = sourceIndexes[sourceIndexes.length - 1];
  const targetStartIndex = targetIndexes[0];
  const targetEndIndex = targetIndexes[targetIndexes.length - 1];

  if (
    sourceStartIndex == null ||
    sourceEndIndex == null ||
    targetStartIndex == null ||
    targetEndIndex == null
  ) {
    return null;
  }

  if (placement === "before" && sourceStartIndex <= targetEndIndex) {
    return null;
  }

  if (placement === "after" && sourceEndIndex >= targetStartIndex) {
    return null;
  }

  return toContiguousMoveOperationGroup(
    sourceSorted,
    placement,
    targetSorted[0]?.targetBlock,
    targetSorted[targetSorted.length - 1]?.targetBlock,
  );
}

function toContiguousMoveOperationGroup(
  sourceSorted: MoveCandidate[],
  placement: OperationPlacement,
  targetStartBlock: LocalAiDocumentBlock | undefined,
  targetEndBlock: LocalAiDocumentBlock | undefined,
): ContiguousMoveOperationGroup[] {
  const sourceStart = sourceSorted[0];
  const sourceEnd = sourceSorted[sourceSorted.length - 1];

  if (!sourceStart || !sourceEnd || !targetStartBlock || !targetEndBlock) {
    return [];
  }

  return [
    {
      operationIndexes: sourceSorted.map((candidate) => candidate.operationIndex),
      placement,
      sourceEndBlock: sourceEnd.sourceBlock,
      sourceStartBlock: sourceStart.sourceBlock,
      targetEndBlock,
      targetStartBlock,
    },
  ];
}

function hasContiguousIndexes(indexes: number[]) {
  return indexes.every((index, offset) => offset === 0 || index === indexes[offset - 1] + 1);
}

function hasConstantPairwiseOffset(candidates: MoveCandidate[]) {
  const firstCandidate = candidates[0];

  return (
    Boolean(firstCandidate) &&
    candidates.every(
      (candidate) =>
        candidate.sourceIndex - candidate.targetIndex ===
        firstCandidate.sourceIndex - firstCandidate.targetIndex,
    )
  );
}
