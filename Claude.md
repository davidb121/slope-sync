# CLAUDE.md — Ski School Supervisor App (SlopeSync)

Internal PWA for ski school supervisors at Mt. Rose. Supervisors roam the mountain checking in with instructors, assigning/reassigning kids to instructors, and verifying lesson levels. Full plan in `docs/project-plan.md`.

## Stack (fixed — do not substitute)
- React + Vite + Tailwind CSS, PWA via `vite-plugin-pwa`
- Supabase: Postgres, Auth, Realtime, RLS on every table
- Hosted on Vercel; sync job is a Vercel serverless function
- Data source: Lucee CFML endpoint `https://skis.skirose.com/api/dailyRoster.cfm` — **placeholder only**; when `USE_STATIC_SEED=true`, serve `data/seed.json` instead. Never hardcode the live URL into components; it lives in env config.

## Business rules (never violate)
1. Level taxonomy is exactly 12 buckets: SKI-A-1..4 (ski, ages 4–5), SKI-B-1..4 (ski, ages 6–12), SBD-1..4 (snowboard, ages 7–12). No other levels, no age sub-groups.
2. Reassignment: discipline is fixed; age band derived from student AGE (not booked level); level moves ±1 freely, >1 requires confirmation; age < 7 can never be in a snowboard group.
3. A student has exactly one active assignment (partial unique index enforces this). Reassign = close old row with status='moved' + required reason, insert new row. Never UPDATE an assignment's instructor in place.
4. Importer flags (does not silently accept) rows violating age/discipline rules.

## Conventions
- Upserts key on `external_id` (Siriusware/UKG IDs) for round-tripping to on-site SQL Server later.
- All timestamps timestamptz; lesson data scoped by `lesson_date`.
- UI: mobile-first, glove-friendly (min 44px tap targets), high contrast for sunlight, pickers/chips over typing.
- Supabase client lives in `src/lib/supabase.js`; realtime subscriptions in custom hooks (`src/hooks/`).
- No form libraries, no state-management libraries unless a screen genuinely needs it — keep deps light.

## Testing expectations
- Seed data (`data/seed.json`) includes deliberate bad rows (e.g., SW-100030: age-6 snowboarder). Import tests must assert these are FLAGGED, not imported.
- Before marking any assignment feature done, verify: two browser tabs open, reassignment in one appears in the other via realtime without refresh.

## Phases (build in order, don't skip ahead)
0. Scaffold: Vite + React + Tailwind + PWA plugin + Supabase client + Vercel config
1. Schema + RLS + seed import in static mode
2. Auth, Today Board (realtime), Assign/Reassign, Level Verify
3. Check-ins, reassignment reporting, PWA polish
4. (Later) Real Lucee endpoint + write-back to SQL Server — do not build now