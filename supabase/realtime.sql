-- Enable Realtime on the tables that supervisors subscribe to.
-- Run once in Supabase SQL Editor (or Dashboard → Database → Publications → supabase_realtime → Add table).
alter publication supabase_realtime add table assignments;
alter publication supabase_realtime add table students;
