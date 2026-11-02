import { createFileRoute } from "@tanstack/react-router";
import { DeskPage } from "@/features/desk/desk-page";

export const Route = createFileRoute("/desk")({
  head: () => ({
    meta: [{ title: "Desk · Sirius" }],
  }),
  component: DeskPage,
});
