# `src/lib/og/site.json`

Describes share-card metadata consumed by `snapshotOgIdentity()` /
`grokOgHeadTags()` in `scripts/grok-pwa-shared.mjs`.

Typical fields:

- `title` / `description` — share text
- `color` — 6-digit hex for placeholder cards
- `card` — `"custom"` when `public/og.jpg` is the real asset
- `type` — e.g. `x:game` for game-style cards

Keep the JSON valid UTF-8. Prefer handing it over via `write-atomic.mjs` so a
concurrent build never reads a half-written file.
