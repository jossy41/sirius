import { createFileRoute } from "@tanstack/react-router";
import { DocumentDetailPage } from "@/features/documents/document-detail-page";

export const Route = createFileRoute("/library/$documentId")({
  head: () => ({ meta: [{ title: "Document · Sirius" }] }),
  component: function DocumentRoute() {
    const { documentId } = Route.useParams();
    return <DocumentDetailPage documentId={documentId} />;
  },
});
