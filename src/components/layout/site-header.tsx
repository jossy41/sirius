import { Link } from "@tanstack/react-router";
import { SiriusMark } from "@/components/brand/mark";
import { useLocalLibrary } from "@/lib/offline/use-local-library";

export function SiteHeader() {
  const { profile } = useLocalLibrary();
  const gradeLabel = profile.grade ? `Grade ${profile.grade}` : "Set grade";

  return (
    <header className="bg-primary text-primary-fg">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 md:px-8">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2">
          <SiriusMark className="size-5 shrink-0" />
          <span className="font-serif text-2xl leading-none font-semibold tracking-tight">Sirius</span>
          <span className="sr-only">JOSCH LABS</span>
        </Link>
        <div className="flex items-center gap-4">
          <p className="hidden text-sm font-medium text-primary-fg/80 md:block">JOSCH LABS</p>
          <Link to="/you" className="inline-flex min-h-11 items-center text-sm font-semibold">
            {gradeLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
