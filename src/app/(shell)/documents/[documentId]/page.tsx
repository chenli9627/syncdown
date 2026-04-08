import { DocumentEditorShell } from "@/features/editor/components/document-editor-shell";

type DocumentPageProps = {
  params: Promise<{ documentId: string }>;
};

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { documentId } = await params;

  return <DocumentEditorShell documentId={documentId} />;
}
