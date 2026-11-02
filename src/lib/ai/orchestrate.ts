export { runClientTutorTurn as runTutorTurn } from "./client-orchestrate.ts";
export type { ClientTutorPrefer as TutorPrefer } from "./client-orchestrate.ts";
export function providerStatusLabel(prefer: "offline" | "mock" | "auto" | "live" = "offline"): string {
  if (prefer === "offline") return "Offline heuristic";
  if (prefer === "mock") return "Mock development provider";
  if (prefer === "live") return "Live provider (server + consent required)";
  return "Offline heuristic (default)";
}
