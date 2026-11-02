import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  CircleUser,
  Files,
  GraduationCap,
  House,
  NotebookPen,
  Lightbulb,
  ChartNoAxesCombined,
  RotateCcw,
  ClipboardList,
  MessagesSquare,
} from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: House, exact: true },
  { to: "/desk", label: "Desk", icon: NotebookPen, exact: true },
  { to: "/library", label: "Library", icon: Files, exact: false },
  { to: "/practice", label: "Practice", icon: GraduationCap, exact: true },
  { to: "/progress", label: "Progress", icon: ChartNoAxesCombined, exact: true },
  { to: "/revision", label: "Revision", icon: RotateCcw, exact: false },
  { to: "/exams", label: "Exams", icon: ClipboardList, exact: false },
  { to: "/tutor", label: "Tutor", icon: MessagesSquare, exact: false },
  { to: "/curriculum", label: "Study", icon: BookOpen, exact: false },
  { to: "/misconceptions", label: "Support", icon: Lightbulb, exact: true },
  { to: "/you", label: "You", icon: CircleUser, exact: true },
] as const;

export function SiteNav() {
  return (
    <nav
      aria-label="Primary"
      className="pb-safe fixed inset-x-0 bottom-0 z-20 flex w-full items-stretch justify-evenly gap-0 border-t border-line bg-surface px-1 pt-1 md:static md:w-56 md:shrink-0 md:flex-col md:items-stretch md:justify-start md:gap-1 md:self-start md:border-t-0 md:bg-transparent md:px-4 md:pt-8 md:pb-0"
    >
      {items.map(({ to, label, icon: Icon, exact }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact }}
          className="flex min-h-12 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 px-0.5 py-1 text-center text-[10px] leading-tight font-medium sm:text-[11px] md:min-h-11 md:flex-none md:flex-row md:justify-start md:gap-2.5 md:rounded-md md:px-3 md:py-2 md:text-left md:text-base"
          activeProps={{ className: "text-primary" }}
          inactiveProps={{ className: "text-muted" }}
        >
          <Icon className="size-4 shrink-0 sm:size-[1.15rem] md:size-5" aria-hidden="true" strokeWidth={2} />
          <span className="max-w-full truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
