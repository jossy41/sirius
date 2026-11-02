import { createFileRoute } from "@tanstack/react-router";
import { DocumentsPage } from "@/features/documents/documents-page";

export const Route = createFileRoute("/library")({
  head: () => ({ meta: [{ title: "Library · Sirius" }] }),
  component: DocumentsPage,
});
