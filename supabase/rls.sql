-- SlopeSync RLS policies — run after schema.sql
-- Service role (sync function) bypasses RLS automatically.
-- Authenticated role = any logged-in supervisor.

alter table profiles       enable row level security;
alter table instructors    enable row level security;
alter table lesson_levels  enable row level security;
alter table students       enable row level security;
alter table assignments    enable row level security;
alter table checkins       enable row level security;

-- profiles: each user sees and edits only their own row
create policy "profiles: own row select"
  on profiles for select using (auth.uid() = id);
create policy "profiles: own row insert"
  on profiles for insert with check (auth.uid() = id);
create policy "profiles: own row update"
  on profiles for update using (auth.uid() = id);

-- lesson_levels: read-only reference data for all authenticated users
create policy "lesson_levels: authenticated read"
  on lesson_levels for select to authenticated using (true);

-- instructors: supervisors read; writes come only from the service-role sync function
create policy "instructors: authenticated read"
  on instructors for select to authenticated using (true);

-- students: supervisors read; writes come only from the service-role sync function
create policy "students: authenticated read"
  on students for select to authenticated using (true);

-- assignments: supervisors read and write (reassign / close)
create policy "assignments: authenticated read"
  on assignments for select to authenticated using (true);
create policy "assignments: authenticated insert"
  on assignments for insert to authenticated with check (true);
create policy "assignments: authenticated update"
  on assignments for update to authenticated using (true);

-- checkins: supervisors read and write
create policy "checkins: authenticated read"
  on checkins for select to authenticated using (true);
create policy "checkins: authenticated insert"
  on checkins for insert to authenticated with check (true);
