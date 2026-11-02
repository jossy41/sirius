import { createFileRoute } from "@tanstack/react-router";
import { ExamsPage } from "@/features/exams/exams-page";

export const Route = createFileRoute("/exams")({
  head: () => ({ meta: [{ title: "Exams · Sirius" }] }),
  component: ExamsPage,
});
