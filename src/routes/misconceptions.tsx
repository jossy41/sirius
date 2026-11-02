import { createFileRoute } from "@tanstack/react-router";
import { MisconceptionsPage } from "@/features/misconceptions/misconceptions-page";

export const Route = createFileRoute("/misconceptions")({
  head: () => ({
    meta: [{ title: "Learning support · Sirius" }],
  }),
  component: MisconceptionsPage,
});
