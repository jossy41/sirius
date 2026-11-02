import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { InstalledPackRecord, Objective, Topic } from "@/lib/curriculum/types";
import { useLocalLibrary } from "@/lib/offline/use-local-library";

function topicsForSubject(topics: Topic[], subjectId: string): Topic[] {
  return topics
    .filter((t) => t.subjectId === subjectId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}

function rootTopics(topics: Topic[]): Topic[] {
  return topics.filter((t) => t.parentId === null);
}

function childrenOf(topics: Topic[], parentId: string): Topic[] {
  return topics.filter((t) => t.parentId === parentId);
}

function objectivesForTopic(objectives: Objective[], topicId: string): Objective[] {
  return objectives.filter((o) => o.topicId === topicId);
}

function TopicTree({
  topics,
  objectives,
  parentId,
  depth = 0,
}: {
  topics: Topic[];
  objectives: Objective[];
  parentId: string | null;
  depth?: number;
}) {
  const nodes =
    parentId === null ? rootTopics(topics) : childrenOf(topics, parentId);

  if (nodes.length === 0) return null;

  return (
    <ul className={depth === 0 ? "flex flex-col gap-4" : "mt-2 flex flex-col gap-3 border-l border-line pl-4"}>
      {nodes.map((topic) => {
        const objs = objectivesForTopic(objectives, topic.id);
        return (
          <li key={topic.id}>
            <div>
              <h4 className="font-semibold text-ink">{topic.title}</h4>
              <p className="text-xs text-muted">code {topic.code}</p>
            </div>
            {objs.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-2">
                {objs.map((obj) => (
                  <li
                    key={obj.id}
                    className="rounded-md border border-line bg-surface/60 px-3 py-2 text-sm"
                  >
                    <p className="text-ink">{obj.statement}</p>
                    <p className="mt-1 text-xs text-muted">
                      {obj.cognitiveLevel} · {obj.code}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            <TopicTree topics={topics} objectives={objectives} parentId={topic.id} depth={depth + 1} />
          </li>
        );
      })}
    </ul>
  );
}

export function PackBrowsePage({ packId }: { packId: string }) {
  const library = useLocalLibrary();
  const record = library.getPack(packId);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const subjects = useMemo(() => {
    if (!record) return [];
    return [...record.content.subjects].sort((a, b) => a.name.localeCompare(b.name));
  }, [record]);

  const activeSubjectId = selectedSubjectId ?? subjects[0]?.id ?? null;
  const activeSubject = subjects.find((s) => s.id === activeSubjectId) ?? null;
  const subjectTopics = activeSubject
    ? topicsForSubject(record!.content.topics, activeSubject.id)
    : [];

  if (library.status === "loading") {
    return <p className="text-muted">Loading pack…</p>;
  }

  if (!record) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <p className="text-muted">This pack is not installed on this device.</p>
        <Button asChild variant="primary">
          <Link to="/curriculum">Back to packs</Link>
        </Button>
      </div>
    );
  }

  const meta = record.meta;
  const content = record.content;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-sm font-semibold text-primary">
          <Link to="/curriculum" className="hover:underline">
            Curriculum
          </Link>
          {" · "}
          Grade {meta.gradeCode}
          {meta.streamCode ? ` · ${meta.streamCode}` : ""}
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-tight text-ink md:text-5xl">{meta.title}</h1>
        <p className="mt-2 text-muted">
          {content.system.name} · {content.version.label}
        </p>
        {meta.isDevelopmentFixture ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Development fixture only. Not official Ministry of Education curriculum content.
          </p>
        ) : null}
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl text-ink">Subjects</h2>
        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => (
            <Button
              key={subject.id}
              variant={subject.id === activeSubjectId ? "primary" : "ghost"}
              onClick={() => setSelectedSubjectId(subject.id)}
            >
              {subject.name}
            </Button>
          ))}
        </div>
      </section>

      {activeSubject ? (
        <Panel>
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-serif text-xl text-ink">{activeSubject.name}</h3>
              <p className="text-sm text-muted">
                code {activeSubject.code} · language {activeSubject.language}
                {activeSubject.streamCodes.length > 0
                  ? ` · streams ${activeSubject.streamCodes.join(", ")}`
                  : " · all streams"}
              </p>
            </div>
            {subjectTopics.length === 0 ? (
              <p className="text-muted">No topics in this subject.</p>
            ) : (
              <TopicTree
                topics={subjectTopics}
                objectives={content.objectives}
                parentId={null}
              />
            )}
          </div>
        </Panel>
      ) : null}

      {content.sourceRefs.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-ink">Source references</h2>
          <ul className="flex flex-col gap-2 text-sm text-muted">
            {content.sourceRefs.map((ref) => (
              <li key={ref.id} className="border-t border-line pt-2 first:border-t-0 first:pt-0">
                <span className="text-ink">{ref.citation}</span>
                {ref.locator ? ` · ${ref.locator}` : ""}
                {ref.url ? (
                  <>
                    {" · "}
                    <a href={ref.url} className="text-primary underline" target="_blank" rel="noreferrer">
                      link
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Type-only export helper for routes. */
export type { InstalledPackRecord };
