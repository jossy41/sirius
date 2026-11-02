import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper px-6 text-center text-ink">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-serif text-3xl leading-tight">Something went wrong</h1>
      <p className="max-w-md text-base break-words text-muted">{errorMessage(error)}</p>
      <a
        href="/"
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 font-semibold text-primary-fg"
      >
        Back home
      </a>
    </main>
  );
}
