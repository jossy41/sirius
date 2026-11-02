import { createFileRoute } from "@tanstack/react-router";
import { ProgressPage } from "@/features/progress/progress-page";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Knowledge & Progress · Sirius" }] }),
  component: ProgressPage,
});
