import { createFileRoute } from "@tanstack/react-router";
import { ExamSessionPage } from "@/features/exams/exam-session-page";

export const Route = createFileRoute("/exams/$examId")({
  head: () => ({ meta: [{ title: "Assessment · Sirius" }] }),
  component: ExamSessionPage,
});
