import { createFileRoute } from "@tanstack/react-router";
import { ExamResultsPage } from "@/features/exams/exam-results-page";

export const Route = createFileRoute("/exams/results/$examId")({
  head: () => ({ meta: [{ title: "Results · Sirius" }] }),
  component: ExamResultsPage,
});
