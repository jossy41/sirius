import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { cloudLibraryStatus } from "@/lib/config/env";
import { GREETING_FALLBACK, greeting } from "@/lib/copy/greeting";
import { stageLabel } from "@/lib/learner/profile";
import { noteCountLabel } from "@/lib/notes/model";
import { useLocalLibrary } from "@/lib/offline/use-local-library";

export function HomePage() {
  const library = useLocalLibrary();
  const cloud = cloudLibraryStatus();
  const [hello, setHello] = useState(GREETING_FALLBACK);
  useEffect(() => {
    setHello(greeting());
  }, []);

  const name = library.profile.displayName;
  const heading = name ? `${hello}, ${name}.` : `${hello}.`;
  const notes = library.notes;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-sm font-semibold text-primary">Grades 9–12</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight text-ink md:text-5xl">{heading}</h1>
        <p className="mt-3 text-lg text-pretty text-muted">
          Understand more, memorize less. Curriculum packs, local documents, practice, and revision
          stay on this device — adaptable beyond a single education system.
        </p>
      </header>

      <Panel className="space-y-3">
        <h2 className="font-serif text-2xl text-ink">Learning path</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>Install a curriculum pack</li>
          <li>Import study PDFs into Library</li>
          <li>Practice and get feedback</li>
          <li>Address misconceptions</li>
          <li>Revise on a schedule</li>
          <li>Check progress and try practice assessments</li>
        </ol>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="secondary"><Link to="/library">Library</Link></Button>
          <Button asChild variant="secondary"><Link to="/practice">Practice</Link></Button>
          <Button asChild variant="secondary"><Link to="/progress">Progress</Link></Button>
          <Button asChild variant="secondary"><Link to="/revision">Revision</Link></Button>
          <Button asChild variant="secondary"><Link to="/tutor" search={{ topic: undefined, objectiveId: undefined, misconceptionId: undefined, mode: undefined }}>Tutor</Link></Button>
        </div>
        <p className="text-xs text-muted">
          External AI and semantic embeddings need consent and server configuration. Offline study
          stays available without them.
        </p>
      </Panel>

      {library.status === "loading" ? (
        <p className="text-muted">Opening your notebook…</p>
      ) : library.status === "error" ? null : (
        <>
          <Panel>
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="font-serif text-3xl text-ink">Desk</h2>
                <p className="mt-1 text-muted tabular-nums">{noteCountLabel(notes.length)}</p>
              </div>
              {notes.length > 0 ? (
                <ul className="flex flex-col">
                  {notes.slice(0, 3).map((note) => (
                    <li key={note.id} className="border-t border-line first:border-t-0">
                      <Link
                        to="/desk"
                        hash={`note-${note.id}`}
                        className="block rounded-md py-3"
                      >
                        <span className="block font-semibold break-words text-ink">{note.title}</span>
                        {note.subject ? (
                          <span className="mt-0.5 block text-sm text-muted">{note.subject}</span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div>
                <Button asChild>
                  <Link to="/desk">{notes.length > 0 ? "Open desk" : "Write a note"}</Link>
                </Button>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="font-serif text-3xl text-ink">Study</h2>
                <p className="mt-1 text-pretty text-muted">
                  Browse installed curriculum packs offline — subjects, topics, and learning objectives.
                </p>
              </div>
              <div>
                <Button asChild variant="secondary">
                  <Link to="/curriculum">Open curriculum</Link>
                </Button>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="font-serif text-3xl text-ink">Learner</h2>
                <p className="mt-1 text-pretty text-muted">
                  {stageLabel(library.profile.grade, library.profile.stream)}
                </p>
                <p className="mt-1 text-sm text-muted">Stored on this device. This is not an account.</p>
              </div>
              <div>
                <Button asChild variant="secondary">
                  <Link to="/you">{library.profile.grade ? "Update" : "Set grade"}</Link>
                </Button>
              </div>
            </div>
          </Panel>
        </>
      )}

      {cloud.state === "offline" ? null : (
        <p className="text-sm text-pretty text-muted">{cloud.summary}</p>
      )}
      <p className="text-sm text-muted">Sirius · JOSCH LABS</p>
    </div>
  );
}
