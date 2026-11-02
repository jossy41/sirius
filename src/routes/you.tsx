import { createFileRoute } from "@tanstack/react-router";
import { YouPage } from "@/features/you/you-page";

export const Route = createFileRoute("/you")({
  head: () => ({
    meta: [{ title: "You · Sirius" }],
  }),
  component: YouPage,
});
