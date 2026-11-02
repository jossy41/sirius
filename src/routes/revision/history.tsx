import { createFileRoute } from "@tanstack/react-router";
import { RevisionHistoryPage } from "@/features/revision/revision-history-page";

export const Route = createFileRoute("/revision/history")({
  head: () => ({ meta: [{ title: "Revision history · Sirius" }] }),
  component: RevisionHistoryPage,
});
