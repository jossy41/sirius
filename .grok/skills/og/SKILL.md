---
name: og
description: "Open Graph identity, share cards, and brand-asset pass for this app"
user-invocable: false
---

# Open Graph & brand assets

This skill governs **share-card identity** for the app: `public/og.jpg` (or the
configured card path), `src/lib/og/site.json`, and the platform head tags injected
by `scripts/grok-pwa-shared.mjs` / `server/middleware/grok-pwa.ts`.

Read `references/brand-task.md` and `references/site-json.md` when generating or
repairing brand assets.

## Marker path and staleness

While a brand-asset pass is generating, keep this marker file fresh:

- **`/workspace/.grok/og-pending`**

Gates use `scripts/brand-check.mjs`. A marker older than **10 minutes** is treated
as stale so a stopped mid-generation does not hide a missing card forever.

## Brand-asset pass:

Launch brand work as a **background subagent** the moment name and palette settle.
**No `wait_tasks`, never `get_task_output` on it** — do not wait for share-card
generation on the critical path, and do not consume its output in a way that
suppresses completion.

- Keep building the product while the pass runs.
- Keep `/workspace/.grok/og-pending` fresh while generating (stale after 10 minutes).
- When assets are ready, hand them over with `write-atomic.mjs`, then remove the marker.
- Unless your own prompt says you *are* the pass — then produce the assets yourself.

## Self-check (exact CLI)

Before declaring the brand pass done, self-check with the flag this CLI accepts:

```bash
node scripts/brand-check.mjs --placeholder-ok
```

For canvas/game apps that need the 50:11 banner:

```bash
node scripts/brand-check.mjs --game
```

Optional workspace root:

```bash
node scripts/brand-check.mjs --root /workspace
```

Exit code `0` and `"ok": true` in the JSON means the on-disk assets pass.

## Hand-over (atomic write)

Stage files under `/workspace`, then rename into the tree the app reads:

```bash
node scripts/write-atomic.mjs /workspace/.grok/og.jpg.tmp public/og.jpg
node scripts/write-atomic.mjs /workspace/.grok/site.json.tmp src/lib/og/site.json
```

Usage is always: `node scripts/write-atomic.mjs <staged-file> <target>`.

## Boundaries enforced by brand-check

- Custom card apps need a real card (not an unacknowledged placeholder).
- Game/canvas apps need `public/x-banner.jpg` within size limits when `--game`.
- `src/lib/og/site.json` must describe the share identity the head injector uses.

## Platform injection

PWA manifest routes and head tags are served by:

- Dev/preview: `scripts/grok-pwa-plugin.mjs`
- Deployed Nitro: `server/middleware/grok-pwa.ts`

Both call `scripts/grok-pwa-shared.mjs` so OG metas and manifest names stay consistent.
