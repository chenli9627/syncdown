export {
  createDocumentForWorkspace,
  markDocumentVisited,
  updateDocumentForUser,
} from "@/features/app-state/lib/mutations/document-editing";
export {
  removeDocumentAccessForOwner,
  shareDocumentWithUser,
  updateDocumentAccessForOwner,
} from "@/features/app-state/lib/mutations/document-access";
export {
  moveDocumentToTrashForOwner,
  permanentlyDeleteDocumentFromTrashForOwner,
  restoreDocumentFromTrashForOwner,
} from "@/features/app-state/lib/mutations/document-trash";
