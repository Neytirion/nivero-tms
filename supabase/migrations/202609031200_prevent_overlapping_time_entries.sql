-- Prevent one user from logging the same or overlapping timed interval twice.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_no_overlapping_intervals
  EXCLUDE USING gist (
    user_id WITH =,
    (
      CASE
        WHEN started_at IS NOT NULL AND ended_at IS NOT NULL
          THEN tstzrange(started_at, ended_at, '[)')
        ELSE NULL
      END
    ) WITH &&
  );
