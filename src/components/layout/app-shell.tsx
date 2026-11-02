import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteNav } from "@/components/layout/site-nav";
import { LocalLibraryProvider } from "@/lib/offline/library-context";
import { useLocalLibrary } from "@/lib/offline/use-local-library";

function LibraryBanner() {
  const library = useLocalLibrary();
  if (library.status !== "error" || !library.errorMessage) return null;
  return (
    <div role="alert" className="mb-6 rounded-lg bg-surface px-4 py-3 text-danger shadow-panel">
      <p>{library.errorMessage}</p>
      <Button variant="danger" className="mt-3" onClick={() => void library.reload()}>
        Try again
      </Button>
    </div>
  );
}

function ShellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-paper text-ink">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-5xl md:items-start">
        <SiteNav />
        <main id="content" tabIndex={-1} className="min-w-0 flex-1 px-4 pt-8 pb-nav outline-none md:px-8 md:pt-10 md:pb-16">
          <LibraryBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <LocalLibraryProvider>
      <ShellFrame>{children}</ShellFrame>
    </LocalLibraryProvider>
  );
}
