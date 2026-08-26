-- Remove free-form notes from time entries.
-- Time logging keeps only structured fields (duration, task, billing, timestamps).
ALTER TABLE public.time_entries
  DROP COLUMN IF EXISTS notes;
