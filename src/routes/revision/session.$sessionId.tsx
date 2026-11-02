import { createFileRoute } from "@tanstack/react-router";
import { RevisionSessionPage } from "@/features/revision/revision-session-page";

export const Route = createFileRoute("/revision/session/$sessionId")({
  head: () => ({ meta: [{ title: "Revision session · Sirius" }] }),
  component: RevisionSessionPage,
});
