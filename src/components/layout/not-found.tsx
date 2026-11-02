import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="flex max-w-xl flex-col items-start gap-4 py-8">
      <h1 className="font-serif text-4xl leading-tight text-ink">This page is not in Sirius.</h1>
      <p className="text-lg text-pretty text-muted">The address does not match a page in this release.</p>
      <Button asChild>
        <Link to="/">Back home</Link>
      </Button>
    </div>
  );
}
