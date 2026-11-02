import { createFileRoute } from "@tanstack/react-router";
import { RevisionPage } from "@/features/revision/revision-page";

export const Route = createFileRoute("/revision")({
  head: () => ({ meta: [{ title: "Revision · Sirius" }] }),
  component: RevisionPage,
});
