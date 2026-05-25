import type { PendingDocumentActionConfirmation } from "@/features/editor/hooks/use-ai-chat-auto-document-action";
import type { MessageKey } from "@/lib/i18n/messages";

type BuildDisplayTextArgs = {
  appliedNotice?: string;
  fallbackNotice: string;
  isAutomaticDocumentAction: boolean;
  pendingDocumentAction: PendingDocumentActionConfirmation | null;
  plainText?: string;
  t: (key: MessageKey) => string;
  toolRequestedCount: number;
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
  toolRequestedCount,
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
      : appendPreviewLines(appliedNotice, toolPreviewLines, toAppliedPreviewLine);
  }

  if (toolSummary) {
    if (toolRequestedCount <= 0) {
      return toolSummary;
    }

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

function appendPreviewLines(
  baseText: string,
  previewLines: string[],
  transformLine: (line: string) => string = (line) => line,
) {
  if (!previewLines.length) {
    return baseText;
  }

  return `${baseText}\n\n${previewLines.map((line) => `- ${transformLine(line)}`).join("\n")}`;
}

function toAppliedPreviewLine(line: string) {
  const trimmed = line.trim();

  if (!trimmed) {
    return trimmed;
  }

  if (/^将插入到块[前后]：/u.test(trimmed)) {
    return trimmed.replace(/^将插入到块[前后]：/u, "已插入：");
  }

  if (/^将删除/u.test(trimmed)) {
    return trimmed.replace(/^将删除/u, "已删除");
  }

  if (/^将标题调整为/u.test(trimmed)) {
    return trimmed.replace(/^将标题调整为/u, "标题已调整为");
  }

  if (/^将列表类型改成/u.test(trimmed)) {
    return trimmed.replace(/^将列表类型改成/u, "列表类型已改成");
  }

  if (/^将整块替换为：/u.test(trimmed)) {
    return trimmed.replace(/^将整块替换为：/u, "已替换为：");
  }

  if (/^将把/u.test(trimmed)) {
    return trimmed.replace(/^将把/u, "已将");
  }

  if (/^将修改/u.test(trimmed)) {
    return trimmed.replace(/^将修改/u, "已修改");
  }

  if (/^将更新/u.test(trimmed)) {
    return trimmed.replace(/^将更新/u, "已更新");
  }

  if (/^将/u.test(trimmed)) {
    return `已${trimmed.slice(1)}`;
  }

  return trimmed;
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
