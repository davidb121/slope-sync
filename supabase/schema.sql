-- SlopeSync schema — run once in Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT DO NOTHING

-- Supervisors log in via Supabase Auth; this table holds app-level profile/role
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'supervisor' check (role in ('supervisor', 'admin')),
  created_at timestamptz default now()
);

create table if not exists instructors (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  full_name text not null,
  disciplines text[] not null default '{ski}',
  cert_level text,
  active boolean default true,
  meeting_zone text,
  created_at timestamptz default now()
);

create table if not exists lesson_levels (
  id serial primary key,
  code text unique not null,
  discipline text not null check (discipline in ('ski', 'snowboard')),
  age_min int not null,
  age_max int not null,
  level int not null check (level between 1 and 4),
  label text not null,
  sort_order int not null
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  first_name text not null,
  last_name text not null,
  age int,
  booked_level_id int references lesson_levels(id),
  verified_level_id int references lesson_levels(id),
  notes text,
  lesson_date date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  instructor_id uuid not null references instructors(id),
  assigned_by uuid references profiles(id),
  status text not null default 'active' check (status in ('active', 'moved', 'completed')),
  reason text,
  started_at timestamptz default now(),
  ended_at timestamptz
);

-- One active assignment per student, enforced at DB level
create unique index if not exists one_active_assignment
  on assignments (student_id) where (status = 'active');

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references instructors(id),
  supervisor_id uuid not null references profiles(id),
  location text,
  group_ok boolean,
  notes text,
  created_at timestamptz default now()
);

-- Mt. Rose level taxonomy: exactly 12 buckets
insert into lesson_levels (code, discipline, age_min, age_max, level, label, sort_order) values
  ('SKI-A-1', 'ski',       4,  5, 1, 'Ski 4–5 · Level 1',         10),
  ('SKI-A-2', 'ski',       4,  5, 2, 'Ski 4–5 · Level 2',         11),
  ('SKI-A-3', 'ski',       4,  5, 3, 'Ski 4–5 · Level 3',         12),
  ('SKI-A-4', 'ski',       4,  5, 4, 'Ski 4–5 · Level 4',         13),
  ('SKI-B-1', 'ski',       6, 12, 1, 'Ski 6–12 · Level 1',        20),
  ('SKI-B-2', 'ski',       6, 12, 2, 'Ski 6–12 · Level 2',        21),
  ('SKI-B-3', 'ski',       6, 12, 3, 'Ski 6–12 · Level 3',        22),
  ('SKI-B-4', 'ski',       6, 12, 4, 'Ski 6–12 · Level 4',        23),
  ('SBD-1',   'snowboard', 7, 12, 1, 'Snowboard 7–12 · Level 1',  30),
  ('SBD-2',   'snowboard', 7, 12, 2, 'Snowboard 7–12 · Level 2',  31),
  ('SBD-3',   'snowboard', 7, 12, 3, 'Snowboard 7–12 · Level 3',  32),
  ('SBD-4',   'snowboard', 7, 12, 4, 'Snowboard 7–12 · Level 4',  33)
on conflict (code) do nothing;
