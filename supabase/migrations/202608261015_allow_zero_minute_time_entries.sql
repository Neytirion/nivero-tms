-- Allow sub-minute timer logs without forcing rounding to one full minute.
-- Exact duration is preserved via started_at/ended_at, while minutes_spent can be 0.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'time_entries_minutes_positive'
      AND conrelid = 'public.time_entries'::regclass
  ) THEN
    ALTER TABLE public.time_entries
      DROP CONSTRAINT time_entries_minutes_positive;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'time_entries_minutes_non_negative'
      AND conrelid = 'public.time_entries'::regclass
  ) THEN
    ALTER TABLE public.time_entries
      ADD CONSTRAINT time_entries_minutes_non_negative
      CHECK (minutes_spent >= 0);
  END IF;
END
$$;