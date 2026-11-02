import { createFileRoute } from "@tanstack/react-router";
import { CurriculumPage } from "@/features/curriculum/curriculum-page";

export const Route = createFileRoute("/curriculum")({
  head: () => ({
    meta: [{ title: "Curriculum · Sirius" }],
  }),
  component: CurriculumPage,
});
