import type { UIMessage } from "ai";
import type { AiDocumentEditPlan } from "@/features/editor/lib/ai-chat-document-edit-types";

export type Permission = "can_edit" | "can_view";

export type AiChatModelKey = "primary" | "secondary";

export type AiChatResponseMode = "key_points" | "list" | "table";

export type AiChatDocumentAction =
  | "edit_blocks"
  | "insert_cursor"
  | "insert_end"
  | "replace_selection";

export type AiChatSelection = {
  from: number;
  text: string;
  to: number;
};

export type AiChatDocumentBlock = {
  html?: string;
  id: string;
  level?: number;
  markdown?: string;
  text: string;
  type: string;
};

export type AiChatMessageMetadata = {
  clarificationKind?: string;
  createdAt: string;
  documentAction?: AiChatDocumentAction | null;
  editPlan?: AiDocumentEditPlan | null;
  modelKey?: AiChatModelKey;
  modelName?: string;
  responseMode?: AiChatResponseMode | null;
  selection?: AiChatSelection | null;
  threadId?: string;
};

export type AiChatMessage = UIMessage<AiChatMessageMetadata>;

export type User = {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
};

export type StoredUser = User & {
  password: string;
};

export type Workspace = {
  id: string;
  ownerUserId: string;
  name: string;
  lastAccessedAt: string;
  createdAt: string;
};

export type DocumentVersion = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  userId: string;
};

export type DocumentUpdate = {
  id: string;
  previousTitle: string;
  nextTitle: string;
  previousContent: string;
  nextContent: string;
  createdAt: string;
  userId: string;
};

export type DocumentRecord = {
  id: string;
  workspaceId: string;
  ownerUserId: string;
  title: string;
  content: string;
  status: "private" | "shared" | "trashed";
  trashedFromStatus?: "private" | "shared" | null;
  deletedAt?: string | null;
  lastEditedAt: string;
  createdAt: string;
  updateHistory?: DocumentUpdate[];
  versionHistory?: DocumentVersion[];
};

export type DocumentAccess = {
  documentId: string;
  userId: string;
  permission: Permission;
};

export type RecentVisit = {
  userId: string;
  documentId: string;
  visitedAt: string;
};

export type Session = {
  userId: string;
  currentWorkspaceId: string;
};

export type AiChatThread = {
  id: string;
  documentId: string;
  userId: string;
  messages: AiChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type SyntextState = {
  users: User[];
  workspaces: Workspace[];
  documents: DocumentRecord[];
  accesses: DocumentAccess[];
  recentVisits: RecentVisit[];
};

export type StoredSyntextState = {
  aiChatThreads?: AiChatThread[];
  users: StoredUser[];
  workspaces: Workspace[];
  documents: DocumentRecord[];
  accesses: DocumentAccess[];
  recentVisits: RecentVisit[];
};
