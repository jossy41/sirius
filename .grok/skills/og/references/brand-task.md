# Brand-asset pass (reference)

## Goal

Ship a coherent Open Graph / X share identity without blocking product work.

## Pending marker

Path: `/workspace/.grok/og-pending`  
Stale after **10 minutes** (`OG_PENDING_MAX_AGE_MS` in `scripts/brand-check.mjs`).

While generating, touch the marker. When finished, delete it.

## Never wait

The parent agent must not wait on the brand subagent. Product code continues;
gates ignore active pending windows.

## Atomic hand-over

Use only:

```bash
node scripts/write-atomic.mjs <staged-file> <target>
```

Both paths must be on the same filesystem as the workspace.

## Self-check

```bash
node scripts/brand-check.mjs --placeholder-ok
```

or for games:

```bash
node scripts/brand-check.mjs --game
```
