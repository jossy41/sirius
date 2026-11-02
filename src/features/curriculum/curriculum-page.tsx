import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getDevelopmentFixturePacks } from "@/lib/curriculum/fixtures";
import type { CurriculumPack } from "@/lib/curriculum/types";
import { useLocalLibrary } from "@/lib/offline/use-local-library";

export function CurriculumPage() {
  const library = useLocalLibrary();
  const [available, setAvailable] = useState<CurriculumPack[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void getDevelopmentFixturePacks().then(setAvailable);
  }, []);

  const installedIds = new Set(library.packs.map((p) => p.packId));

  const handleInstall = useCallback(
    async (pack: CurriculumPack) => {
      setBusyId(pack.meta.packId);
      setMessage(null);
      try {
        const result = await library.installPack(pack);
        if (result.status === "installed") {
          setMessage(`Installed “${pack.meta.title}”.`);
        } else if (result.status === "replaced") {
          setMessage(`Updated “${pack.meta.title}”.`);
        } else if (result.status === "skipped") {
          setMessage(`“${pack.meta.title}” is already installed.`);
        } else {
          setMessage(result.message + (result.issues?.length ? ` (${result.issues[0]})` : ""));
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Install failed.");
      } finally {
        setBusyId(null);
      }
    },
    [library],
  );

  const handleRemove = useCallback(
    async (packId: string, title: string) => {
      setBusyId(packId);
      setMessage(null);
      try {
        await library.removePack(packId);
        setMessage(`Removed “${title}”.`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Remove failed.");
      } finally {
        setBusyId(null);
      }
    },
    [library],
  );

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-sm font-semibold text-primary">Curriculum</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight text-ink md:text-5xl">
          Study packs
        </h1>
        <p className="mt-3 text-lg text-pretty text-muted">
          Install a curriculum pack on this device, then browse subjects, topics, and learning
          objectives offline. Packs are versioned and validated before install.
        </p>
      </header>

      {message ? (
        <p className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink" role="status">
          {message}
        </p>
      ) : null}

      {library.status === "loading" ? (
        <p className="text-muted">Opening on-device storage…</p>
      ) : library.status === "error" ? (
        <p className="text-muted">{library.errorMessage}</p>
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="font-serif text-2xl text-ink">Installed</h2>
            {library.packs.length === 0 ? (
              <p className="text-muted">No packs installed yet. Install a development fixture below.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {library.packs.map((record) => (
                  <li key={record.packId}>
                    <Panel>
                      <div className="flex flex-col gap-3">
                        <div>
                          <h3 className="font-semibold text-ink">{record.meta.title}</h3>
                          <p className="mt-1 text-sm text-muted">
                            {record.content.system.name} · Grade {record.meta.gradeCode}
                            {record.meta.streamCode ? ` · ${record.meta.streamCode}` : " · common"} ·{" "}
                            {record.content.version.label}
                          </p>
                          {record.meta.isDevelopmentFixture ? (
                            <p className="mt-1 text-xs font-medium text-amber-800">
                              Development fixture — not official MoE content
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild variant="primary">
                            <Link to="/curriculum/$packId" params={{ packId: record.packId }}>
                              Open
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            disabled={busyId === record.packId}
                            onClick={() => void handleRemove(record.packId, record.meta.title)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </Panel>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-serif text-2xl text-ink">Available to install</h2>
            <p className="text-sm text-muted">
              The packs below are labeled development fixtures. They illustrate the data model and
              offline install flow. They are not verified Ethiopian curriculum content.
            </p>
            <ul className="flex flex-col gap-3">
              {available.map((pack) => {
                const installed = installedIds.has(pack.meta.packId);
                return (
                  <li key={pack.meta.packId}>
                    <Panel>
                      <div className="flex flex-col gap-3">
                        <div>
                          <h3 className="font-semibold text-ink">{pack.meta.title}</h3>
                          <p className="mt-1 text-sm text-muted">{pack.meta.description}</p>
                          <p className="mt-1 text-xs text-muted">
                            System {pack.meta.systemId} · version {pack.meta.versionId} · hash{" "}
                            {pack.meta.contentHash.slice(0, 12)}…
                          </p>
                        </div>
                        <div>
                          <Button
                            variant={installed ? "ghost" : "primary"}
                            disabled={busyId === pack.meta.packId}
                            onClick={() => void handleInstall(pack)}
                          >
                            {busyId === pack.meta.packId
                              ? "Working…"
                              : installed
                                ? "Reinstall / update"
                                : "Install"}
                          </Button>
                        </div>
                      </div>
                    </Panel>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
