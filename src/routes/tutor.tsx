import { createFileRoute } from "@tanstack/react-router";
import { TutorPage } from "@/features/tutor/tutor-page";

export const Route = createFileRoute("/tutor")({
  head: () => ({ meta: [{ title: "Tutor · Sirius" }] }),
  component: TutorPage,
  validateSearch: (search: Record<string, unknown>) => ({
    topic: typeof search.topic === "string" ? search.topic : undefined,
    objectiveId: typeof search.objectiveId === "string" ? search.objectiveId : undefined,
    misconceptionId: typeof search.misconceptionId === "string" ? search.misconceptionId : undefined,
    mode: typeof search.mode === "string" ? search.mode : undefined,
  }),
});
