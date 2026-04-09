"use client";

import type { Locale, MessageKey } from "@/lib/i18n/messages";

type TranslateFn = (key: MessageKey) => string;

const exactErrorKeys: Record<string, MessageKey> = {
  "AI request failed": "aiGenerationFailed",
  "Access removal failed": "accessRemovalFailed",
  "Current password is incorrect": "currentPasswordIncorrect",
  "Delete failed": "deleteFailed",
  "Document creation failed": "documentCreationFailed",
  "Document does not exist": "documentDoesNotExist",
  "Document open failed": "documentOpenFailed",
  "Document save failed": "documentSaveFailed",
  "Document share failed": "documentShareFailed",
  "Document title already exists in this workspace": "documentTitleExists",
  "Editor is not ready": "editorNotReady",
  "Email already exists": "emailExists",
  "Email cannot contain Chinese characters": "emailNoChinese",
  "Email is required": "emailRequired",
  "Failed to read image": "imageReadFailed",
  "Failed to upload image": "imageUploadFailed",
  "Image is too large": "imageTooLarge",
  "Invalid username or password": "invalidUsernameOrPassword",
  "Login failed": "loginFailed",
  "Move to trash failed": "moveToTrashFailed",
  "Name is required": "nameRequired",
  "Only .md and .zip files are supported": "markdownImportUnsupportedFileType",
  "Only the workspace owner can change permissions": "documentOnlyOwnerChangePermissions",
  "Only the workspace owner can create documents": "documentOnlyOwnerCreate",
  "Only the workspace owner can move this document to trash": "documentOnlyOwnerMoveToTrash",
  "Only the workspace owner can permanently delete this document":
    "documentOnlyOwnerDeletePermanently",
  "Only the workspace owner can remove access": "documentOnlyOwnerRemoveAccess",
  "Only the workspace owner can restore this document": "documentOnlyOwnerRestore",
  "Only the workspace owner can share this document": "documentOnlyOwnerShare",
  "Only the workspace owner can edit the document title": "documentOnlyOwnerEditTitle",
  "Password cannot contain Chinese characters": "passwordNoChinese",
  "Password must be at least 8 characters": "passwordMinLength",
  "Raw HTML blocks are not supported in markdown import": "markdownHtmlUnsupported",
  "Password update failed": "passwordUpdateFailed",
  "Permission update failed": "permissionUpdateFailed",
  "Profile update failed": "profileUpdateFailed",
  "Registration failed": "registrationFailed",
  "Restore failed": "restoreFailed",
  "Footnotes are not supported yet": "markdownFootnotesUnsupported",
  "Markdown links are not supported yet": "markdownLinksUnsupported",
  "Nested markdown lists are not supported yet": "markdownNestedListsUnsupported",
  "Strikethrough markdown is not supported yet": "markdownStrikeUnsupported",
  "This user already has access": "documentAccessExists",
  "This user does not exist": "targetUserDoesNotExist",
  "This user does not have access": "documentAccessMissing",
  "Unsupported image format": "unsupportedImageFormat",
  "User does not exist": "userDoesNotExist",
  "Username already exists": "usernameExists",
  "Username cannot contain Chinese characters": "usernameNoChinese",
  "Username does not exist": "usernameDoesNotExist",
  "Username is required": "usernameRequired",
  "Username only allows letters, digits, and underscores": "usernameFormatInvalid",
  "Workspace creation failed": "workspaceCreationFailed",
  "Workspace delete failed": "workspaceDeleteFailed",
  "Workspace name already exists": "workspaceNameExists",
  "Workspace name does not match": "workspaceNameDoesNotMatch",
  "Workspace name is required": "workspaceNameRequired",
  "Workspace rename failed": "workspaceRenameFailed",
  "You cannot change the owner permission": "documentCannotChangeOwnerPermission",
  "You cannot manage this workspace": "workspaceManageDenied",
  "You cannot remove the owner": "documentCannotRemoveOwner",
  "You cannot share a document with yourself": "documentCannotShareSelf",
  "You do not have access to this document": "documentNoAccess",
  "You do not have permission to edit this document": "documentEditDenied",
  "You do not have permission to import": "documentImportDenied",
  "You must be inside a workspace": "workspaceRequired",
  "You must be logged in": "loginRequired",
  "上传文件过大": "fileTooLarge",
  generation_failed: "aiGenerationFailed",
};

const prefixErrorKeys: Array<[prefix: string, key: MessageKey]> = [
  ["Zip archive contains unreferenced files:", "zipContainsUnreferencedFiles"],
  [
    "Zip archive may only contain one Markdown file and referenced image assets:",
    "zipContainsInvalidFiles",
  ],
  ["Zip archive contains unsupported image assets:", "zipContainsUnsupportedImages"],
  ["Zip archive is missing image assets:", "zipMissingImageAssets"],
];

export function translateAppError(
  error: string | null | undefined,
  t: TranslateFn,
  locale?: Locale,
) {
  if (!error) {
    return null;
  }

  const exactKey = exactErrorKeys[error];

  if (exactKey) {
    return t(exactKey);
  }

  for (const [prefix, key] of prefixErrorKeys) {
    if (error.startsWith(prefix)) {
      const suffix = error.slice(prefix.length).trim();
      const base = t(key);
      return suffix ? `${base} ${suffix}` : base;
    }
  }

  if (locale === "zh") {
    if (error === "Zip archive does not contain a Markdown file") {
      return t("zipMissingMarkdown");
    }
    if (error === "Zip archive must contain exactly one Markdown file") {
      return t("zipMultipleMarkdown");
    }
  } else {
    if (error === "Zip archive does not contain a Markdown file") {
      return t("zipMissingMarkdown");
    }
    if (error === "Zip archive must contain exactly one Markdown file") {
      return t("zipMultipleMarkdown");
    }
  }

  return error;
}
