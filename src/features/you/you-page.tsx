import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceButton, ChoiceGroup, Panel } from "@/components/ui/panel";
import { Field, TextInput } from "@/components/ui/field";
import { cloudLibraryStatus } from "@/lib/config/env";
import {
  GRADES,
  STREAMS,
  preparatoryGrade,
  stageLabel,
  validateDisplayName,
  type Grade,
  type LearnerProfile,
  type Stream,
} from "@/lib/learner/profile";
import { useLocalLibrary } from "@/lib/offline/use-local-library";
import { Link } from "@tanstack/react-router";
import { getSupabaseClient } from "@/lib/supabase/client";

export function YouPage() {
  const library = useLocalLibrary();
  const cloud = cloudLibraryStatus();

  useEffect(() => {
    if (cloud.state !== "ready") return;
    void getSupabaseClient().catch(() => undefined);
  }, [cloud.state]);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <header>
        <h1 className="font-serif text-4xl leading-tight text-ink">You</h1>
        <p className="mt-2 text-sm">
          <Link to="/misconceptions" className="text-primary underline underline-offset-2">
            Review learning support patterns
          </Link>
        </p>
        <p className="mt-3 text-lg text-pretty text-muted">
          This profile stays on this device. It is not an account, and it does not sign you in.
        </p>
      </header>

      {library.status === "loading" ? (
        <p className="text-muted">Opening your notebook…</p>
      ) : library.status === "error" ? null : (
        <ProfileForm profile={library.profile} onSave={library.saveProfile} />
      )}

      <Panel>
        <h2 className="font-serif text-3xl text-ink">This installation</h2>
        <p className="mt-3 text-pretty text-muted">{cloud.summary}</p>
        {cloud.state === "ready" ? (
          <p className="mt-2 text-sm break-words text-muted">Host: {cloud.host}</p>
        ) : null}
        {cloud.state === "misconfigured" ? (
          <p className="mt-2 text-sm text-pretty text-danger">{cloud.detail}</p>
        ) : null}
        <p className="mt-4 text-sm text-pretty text-muted">
          Profile and notes are saved in this browser only. Sirius does not sync them in this release.
        </p>
      </Panel>
    </div>
  );
}

function ProfileForm({
  profile,
  onSave,
}: {
  profile: LearnerProfile;
  onSave: (profile: LearnerProfile) => Promise<void>;
}) {
  const [name, setName] = useState(profile.displayName);
  const [grade, setGrade] = useState<Grade | null>(profile.grade);
  const [stream, setStream] = useState<Stream | null>(profile.stream);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const streamsOpen = preparatoryGrade(grade);
  const profileStamp = useRef(profile.updatedAt);

  useEffect(() => {
    if (profile.updatedAt === profileStamp.current) return;
    profileStamp.current = profile.updatedAt;
    setName(profile.displayName);
    setGrade(profile.grade);
    setStream(profile.stream);
  }, [profile.updatedAt, profile.displayName, profile.grade, profile.stream]);

  function selectGrade(next: Grade) {
    setGrade(next);
    if (!preparatoryGrade(next)) setStream(null);
    setMessage(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nameError = validateDisplayName(name);
    if (nameError) {
      setError(nameError);
      setMessage(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        displayName: name,
        grade,
        stream: streamsOpen ? stream : null,
        updatedAt: profile.updatedAt,
      });
      setMessage("Saved on this device.");
    } catch (saveError) {
      setMessage(null);
      setError(saveError instanceof Error ? saveError.message : "Could not save on this device.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel>
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <div>
          <h2 className="font-serif text-3xl text-ink">Learner</h2>
          <p className="mt-1 text-pretty text-muted">{stageLabel(grade, streamsOpen ? stream : null)}</p>
        </div>
        <Field label="Name" htmlFor="learner-name" hint="Optional. Shown on your home screen." error={error}>
          <TextInput
            id="learner-name"
            name="name"
            autoComplete="name"
            value={name}
            maxLength={80}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
              setMessage(null);
            }}
          />
        </Field>
        <ChoiceGroup legend="Grade" columnsClassName="sm:grid-cols-4">
          {GRADES.map((item) => (
            <ChoiceButton key={item} pressed={grade === item} onClick={() => selectGrade(item)}>
              Grade {item}
            </ChoiceButton>
          ))}
        </ChoiceGroup>
        <ChoiceGroup
          legend="Stream"
          hint={streamsOpen ? "Preparatory school uses two streams." : "Streams start in Grade 11."}
        >
          {STREAMS.map((item) => (
            <ChoiceButton
              key={item.id}
              pressed={stream === item.id}
              disabled={!streamsOpen}
              onClick={() => {
                setStream(stream === item.id ? null : item.id);
                setMessage(null);
              }}
            >
              {item.label}
            </ChoiceButton>
          ))}
        </ChoiceGroup>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
          {message ? (
            <p role="status" className="text-sm text-primary">
              {message}
            </p>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}
