import { createFileRoute } from "@tanstack/react-router";
import { PackBrowsePage } from "@/features/curriculum/pack-browse-page";

export const Route = createFileRoute("/curriculum/$packId")({
  head: () => ({
    meta: [{ title: "Pack · Sirius" }],
  }),
  component: function PackRoute() {
    const { packId } = Route.useParams();
    return <PackBrowsePage packId={packId} />;
  },
});
