import type { PendingDocumentActionConfirmation } from "@/features/editor/hooks/use-ai-chat-auto-document-action";
import type { MessageKey } from "@/lib/i18n/messages";

type BuildDisplayTextArgs = {
  appliedNotice?: string;
  fallbackNotice: string;
  isAutomaticDocumentAction: boolean;
  pendingDocumentAction: PendingDocumentActionConfirmation | null;
  plainText?: string;
  t: (key: MessageKey) => string;
  toolSummary: string | null;
  toolPreviewLines: string[];
};

export function buildChatMessageDisplayText({
  appliedNotice,
  fallbackNotice,
  isAutomaticDocumentAction,
  pendingDocumentAction,
  plainText,
  t,
  toolSummary,
  toolPreviewLines,
}: BuildDisplayTextArgs) {
  const pendingNotice = pendingDocumentAction
    ? buildPendingDocumentActionText(pendingDocumentAction, t)
    : null;

  if (pendingNotice) {
    return pendingNotice;
  }

  if (!isAutomaticDocumentAction) {
    return plainText ?? toolSummary ?? "";
  }

  if (appliedNotice) {
    return isDocumentNotChangedNotice(appliedNotice)
      ? appliedNotice
      : appendPreviewLines(appliedNotice, toolPreviewLines);
  }

  if (toolSummary) {
    return appendPreviewLines(t("aiUnconfirmedDocumentAction"), toolPreviewLines);
  }

  return fallbackNotice;
}

export function buildPendingDocumentActionText(
  pendingDocumentAction: PendingDocumentActionConfirmation,
  t: (key: MessageKey) => string,
) {
  if (pendingDocumentAction.action === "edit_blocks") {
    const parts = [t("aiPendingDocumentAction")];

    if (pendingDocumentAction.plan.summary) {
      parts.push(toPendingDocumentActionSummary(pendingDocumentAction.plan.summary));
    }

    if (pendingDocumentAction.plan.previewLines.length) {
      parts.push(pendingDocumentAction.plan.previewLines.map((line) => `- ${line}`).join("\n"));
    }

    return parts.join("\n\n");
  }

  return `${t("aiPendingGeneratedContent")}\n\n${pendingDocumentAction.plan.responseText}`;
}

export function isDocumentNotChangedNotice(notice: string | undefined) {
  return Boolean(notice && /^(未修改文档|Document was not changed)/i.test(notice.trim()));
}

function appendPreviewLines(baseText: string, previewLines: string[]) {
  if (!previewLines.length) {
    return baseText;
  }

  return `${baseText}\n\n${previewLines.map((line) => `- ${line}`).join("\n")}`;
}

function toPendingDocumentActionSummary(summary: string) {
  const trimmed = summary.trim();

  if (!trimmed) {
    return trimmed;
  }

  if (/^已将/u.test(trimmed)) {
    return trimmed.replace(/^已将/u, "将");
  }

  if (/^已删除/u.test(trimmed)) {
    return trimmed.replace(/^已删除/u, "将删除");
  }

  if (/^已移除/u.test(trimmed)) {
    return trimmed.replace(/^已移除/u, "将移除");
  }

  if (/^已更新/u.test(trimmed)) {
    return trimmed.replace(/^已更新/u, "将更新");
  }

  if (/^已勾选/u.test(trimmed)) {
    return trimmed.replace(/^已勾选/u, "将勾选");
  }

  if (/^已取消勾选/u.test(trimmed)) {
    return trimmed.replace(/^已取消勾选/u, "将取消勾选");
  }

  if (/^已改写/u.test(trimmed)) {
    return trimmed.replace(/^已改写/u, "将改写");
  }

  if (/^已在/u.test(trimmed)) {
    return trimmed.replace(/^已在/u, "将在");
  }

  if (/^在.+插入了/u.test(trimmed)) {
    return `将${trimmed}`;
  }

  return trimmed;
}
