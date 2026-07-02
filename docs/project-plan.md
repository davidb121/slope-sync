# Ski School Supervisor App — Project Plan

**Working name:** SlopeSync (rename at will)
**Purpose:** Mobile-first PWA for ski school supervisors to check in with instructors on-mountain, assign/reassign children to instructors, and verify lesson levels.

---

## 1. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React (Vite) + Tailwind CSS | Vite over CRA — faster, better PWA plugin support |
| PWA | `vite-plugin-pwa` | Installable on Android & iOS home screens, offline shell caching |
| Backend / DB | Supabase | Postgres + Auth + Realtime + Row Level Security |
| Hosting | Vercel | Frontend + serverless functions for the sync job |
| Data source | Lucee CFML endpoint on `skis.skirose.com` | **Placeholder for now** — static JSON seed data until the endpoint exists |

### Why this works well here
- **Supabase Realtime**: when Supervisor A reassigns a kid, Supervisor B's screen updates instantly. This is the killer feature for a distributed on-mountain team.
- **PWA**: no App Store / Play Store submission, no Apple Developer account, instant deploys via Vercel. Supervisors just "Add to Home Screen."
- **Supabase Auth**: magic-link or email/password login for supervisors; RLS keeps student data locked down.

### Known tradeoff to accept up front
iOS PWAs have weaker offline-write support than a native app. Reads can be cached; queued offline *writes* (assigning a kid with zero signal, syncing later) are possible but add real complexity. **Phase 1 assumption: supervisors have at least intermittent connectivity.** If true offline writes become a hard requirement later, that's the trigger to revisit Expo/React Native.

---

## 2. Data Flow

```
On-site SQL Server (Siriusware / UKG)
        │
        ▼
Lucee CFML server (skis.skirose.com) — two separate endpoints [PHASE 4]:
  • /api/instructorAssignments.cfm  — which instructor teaches which class/level today
  • /api/dailyStudents.cfm          — students enrolled for the day (no instructor pre-assignment)
        │
        ▼  (pulled by)
Vercel Serverless Function (cron: each morning + on-demand "Refresh Roster" button)
        │  upsert
        ▼
Supabase (Postgres)  ◄──►  React PWA (supervisors' phones)
                              realtime subscriptions
```

- **Instructor assignments (Lucee → Supabase):** the manager on duty assigns each instructor to a class/level in the Lucee/Siriusware system each morning. This app imports those assignments (`instructor_classes` table) — it does NOT let supervisors change which level an instructor teaches; that's the manager's job.
- **Students (Lucee → Supabase):** daily list of enrolled students, all arriving **unassigned**. The manager does NOT pre-assign students to instructors. Students are assigned dynamically as they arrive on the mountain.
- **Student assignments (Supabase, in this app):** supervisors choose an instructor and add students to that instructor's class as kids arrive. Classes form in real time.
- **Write-back direction (Supabase → SQL Server):** end-of-day push of final assignments, level verifications, and check-in log. Deferred to Phase 4.

---

## 3. Data Model (Supabase / Postgres)

```sql
-- Supervisors log in via Supabase Auth; this table holds app-level profile/role
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'supervisor',  -- supervisor | admin
  created_at timestamptz default now()
);

create table instructors (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,          -- ID from UKG/Siriusware for round-tripping
  full_name text not null,
  disciplines text[] not null default '{ski}',  -- '{ski}', '{snowboard}', or '{ski,snowboard}'
  cert_level text,                  -- e.g. PSIA/AASI level, kids-cert flags
  active boolean default true,
  created_at timestamptz default now()
);

-- Which class/level each instructor is assigned to teach on a given day.
-- Set by the manager in the Lucee system; imported by the sync function.
-- One instructor can have multiple rows per day (e.g. AM/PM sessions at different levels).
create table instructor_classes (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references instructors(id) on delete cascade,
  level_id int not null references lesson_levels(id),
  lesson_date date not null,
  created_at timestamptz default now(),
  unique (instructor_id, level_id, lesson_date)
);

create table lesson_levels (
  id serial primary key,
  code text unique not null,        -- 'SKI-A-1', 'SKI-B-3', 'SBD-2'
  discipline text not null check (discipline in ('ski','snowboard')),
  age_min int not null,
  age_max int not null,
  level int not null check (level between 1 and 4),
  label text not null,
  sort_order int not null
);

-- Mt. Rose level taxonomy: 12 buckets total
insert into lesson_levels (code, discipline, age_min, age_max, level, label, sort_order) values
  ('SKI-A-1','ski',4,5,1,'Ski 4–5 · Level 1',10),
  ('SKI-A-2','ski',4,5,2,'Ski 4–5 · Level 2',11),
  ('SKI-A-3','ski',4,5,3,'Ski 4–5 · Level 3',12),
  ('SKI-A-4','ski',4,5,4,'Ski 4–5 · Level 4',13),
  ('SKI-B-1','ski',6,12,1,'Ski 6–12 · Level 1',20),
  ('SKI-B-2','ski',6,12,2,'Ski 6–12 · Level 2',21),
  ('SKI-B-3','ski',6,12,3,'Ski 6–12 · Level 3',22),
  ('SKI-B-4','ski',6,12,4,'Ski 6–12 · Level 4',23),
  ('SBD-1','snowboard',7,12,1,'Snowboard 7–12 · Level 1',30),
  ('SBD-2','snowboard',7,12,2,'Snowboard 7–12 · Level 2',31),
  ('SBD-3','snowboard',7,12,3,'Snowboard 7–12 · Level 3',32),
  ('SBD-4','snowboard',7,12,4,'Snowboard 7–12 · Level 4',33);

create table students (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,          -- Siriusware customer/booking ID
  first_name text not null,
  last_name text not null,
  age int,
  booked_level_id int references lesson_levels(id),   -- what they signed up as
  verified_level_id int references lesson_levels(id), -- what a supervisor confirmed
  notes text,                       -- allergies flag, "cries at drop-off", etc.
  lesson_date date not null default current_date,
  created_at timestamptz default now()
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  instructor_id uuid not null references instructors(id),
  assigned_by uuid references profiles(id),
  status text not null default 'active',   -- active | moved | completed
  reason text,                             -- why moved: 'ability too high', 'group size', etc.
  started_at timestamptz default now(),
  ended_at timestamptz
);
-- History is free: reassigning = end old row (status='moved'), insert new row.
-- One active assignment per student, enforced:
create unique index one_active_assignment
  on assignments (student_id) where (status = 'active');

create table checkins (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references instructors(id),
  supervisor_id uuid not null references profiles(id),
  location text,            -- free text or lift/zone picker
  group_ok boolean,         -- quick thumbs up/down on group composition
  notes text,
  created_at timestamptz default now()
);
```

**RLS posture:** enable RLS on every table; policies allow `authenticated` users with a `profiles` row to read/write. Student PII never public. (Exact policies in Phase 1.)

---

## 4. Core Screens

1. **Today Board (home)** — instructors as cards/columns, each showing their current group (names, ages, level chips). Color-coded by level. Search bar to find a kid fast. Realtime.
2. **Assign / Reassign** — tap a student → bottom sheet: current instructor, verified level, "Move to…" with instructor list filtered to compatible level & group size. Requires a `reason` on moves (feeds end-of-day reporting and parent conversations).
3. **Level Verify** — tap the level chip on a student → confirm or bump the level (sets `verified_level_id`). One-thumb operation, gloves-friendly big targets.
4. **Instructor Check-in** — pick instructor → log location, group-OK toggle, note. Shows time since last check-in so supervisors can see who hasn't been visited.
5. **Roster Refresh / Admin** — "Pull today's roster" button (hits the Vercel sync function), import status, unmatched-record review.

**UI notes for on-mountain use:** big tap targets (gloves), high contrast (sunlight), minimal typing — everything should be pickers, chips, and toggles.

### Reassignment rules (enforced in the Move picker)

1. **Discipline is fixed.** A ski student only sees ski instructors; snowboard only snowboard. (Equipment doesn't switch mid-day.)
2. **Age band is fixed.** A 4–5 skier can only move within SKI-A groups; a 6–12 skier within SKI-B. Age band is derived from the student's age, not their booked level — this catches booking errors (e.g., a 5-year-old booked into a 6–12 group gets flagged at import).
3. **Level can move ±1 by default.** Bumping a kid from Level 2 to Level 3 is the everyday case; jumping 1 → 4 shows a confirmation ("big jump — sure?").
4. **Snowboard age floor.** Age < 7 can never appear in a snowboard group; the importer rejects/flags these rows rather than silently accepting them.

---

## 5. Placeholder Sync API

Vercel serverless function `/api/sync-roster` calls two separate Lucee endpoints (Phase 4). Until they exist, the function serves `data/seed.json` (`USE_STATIC_SEED=true`).

**Endpoint 1 — Instructor assignments** (what each instructor is teaching today):
```
GET https://skis.skirose.com/api/instructorAssignments.cfm?date=2026-07-02&key=XXXX
```
```json
{
  "instructors": [
    { "externalId": "UKG-2211", "fullName": "Hans Weber", "disciplines": ["ski"], "certLevel": "PSIA-2" }
  ],
  "instructorClasses": [
    { "instructorExternalId": "UKG-2211", "levelCode": "SKI-B-1" }
  ]
}
```

**Endpoint 2 — Students for the day** (all unassigned — no instructor pre-assignment):
```
GET https://skis.skirose.com/api/dailyStudents.cfm?date=2026-07-02&key=XXXX
```
```json
{
  "students": [
    { "externalId": "SW-104432", "firstName": "Maya", "lastName": "Torres", "age": 7, "discipline": "ski", "bookedLevel": "SKI-B-2", "notes": "" }
  ]
}
```

Upsert logic keys on `external_id` for both instructors and students, so switching from seed → live endpoints is an env flag change.

---

## 6. Build Phases

**Phase 0 — Setup (½ day)**
Vite + React + Tailwind + vite-plugin-pwa scaffold · Supabase project · Vercel project + env vars · repo.

**Phase 1 — Schema & seed (½–1 day)**
Run schema SQL · RLS policies · seed lesson_levels for Mt. Rose's actual level system · `seed.json` with ~30 fake kids, 8 instructors · sync function in static mode.

**Phase 2 — Core UI (2–4 days)**
Auth (supervisor login) · Today Board with realtime · Assign/Reassign flow · Level Verify flow.

**Phase 3 — Check-ins & polish (1–2 days)**
Check-in screen + "time since last visit" view · reassignment reason reporting · PWA install flow, icons, offline read caching.

**Phase 4 — Live data (later)**
Build the real Lucee `dailyRoster.cfm` against Siriusware data · flip the env flag · design + build write-back endpoint (final assignments & verified levels → SQL Server) · morning cron on Vercel.

---

## 7. Open Decisions (park for now, decide before Phase 4)

- ~~Level system codes~~ — **Resolved:** Ski 4–5 (L1–4), Ski 6–12 (L1–4), Snowboard 7–12 (L1–4). Seeded in schema §3.
- **Auth method** — magic link vs. shared-ish passwords; magic link is easiest but supervisors need email on phones.
- **Write-back timing** — end-of-day batch vs. near-realtime pushes to SQL Server.
- **Group size rules** — enforce max group size in the reassign picker, or just warn?
- **Season-over-season data** — `lesson_date` scoping is in place; decide retention/reporting needs later.
