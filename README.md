# Sirius

**Understand More. Memorize Less. Master Everything.**

Offline-first study companion by **JOSCH LABS** for secondary learners. Curriculum packs, local PDF library, practice, misconceptions, mastery, revision, practice assessments, and a source-grounded tutor.

> This release is a **verifiable development snapshot**, not a claim of production readiness for school deployment.

## Stack

- TanStack Start / Router, React 19, TypeScript, Vite
- IndexedDB (local learner data; schema **v10**)
- Optional server-side AI and embeddings (credentials never in the browser)

## Core capabilities

| Area | Status |
|------|--------|
| Curriculum packs (system-agnostic) | Implemented |
| PDF import, extract, chunk, offline library | Implemented |
| Practice, evaluation, Feynman-style prompts | Implemented |
| Misconception detection + lifecycle states | Implemented |
| Knowledge graph, mastery, progress | Implemented |
| Adaptive revision + daily study plan | Implemented |
| Practice assessments (not official exams) | Implemented |
| Tutor offline heuristic (source-grounded) | Implemented |
| Tutor live LLM | Requires server env + consent |
| Lexical / concept / graph retrieval | Implemented offline |
| Vector (embedding) retrieval | Pipeline present; needs credentials for live vectors |
| Multilingual (en / am / om) foundations | **Experimental** |

## Privacy and consent

- External AI and external embedding calls are **off by default**.
- Explicit consent issues a **server-signed HMAC token** (≈2 hours). Client booleans are **not** authorization.
- Revocation clears the local token and denylists the token id **in this server process only** (not a global multi-instance store).
- Document excerpts and messages are only sent externally when authorized and configured.

## Environment (server only)

```bash
SIRIUS_CONSENT_SECRET=          # min 16 characters
SIRIUS_AI_BASE_URL=
SIRIUS_AI_API_KEY=
SIRIUS_AI_MODEL=gpt-4o-mini
SIRIUS_EMBEDDING_BASE_URL=      # optional; falls back to AI base
SIRIUS_EMBEDDING_API_KEY=
SIRIUS_EMBEDDING_MODEL=text-embedding-3-small
```

## Develop

```bash
npm install
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run dev
```

## Retrieval honesty

- **Lexical / concept / graph** work offline without credentials.
- **Embedding similarity** runs only when vectors exist for the same model and a provider (or deterministic test provider in tests) is available.
- Lexical match is **never** labeled as embedding retrieval.

## Known limitations

- Consent revoke is process-local.
- Multilingual NLP is experimental (not production Amharic/Oromo tutoring quality).
- Live LLM/embedding providers are untested without real credentials.
- Official isolated TanStack route CLI regeneration may depend on network/tooling; the checked-in `routeTree.gen.ts` is what production builds use.

## License / product

JOSCH LABS · Sirius learning platform.
