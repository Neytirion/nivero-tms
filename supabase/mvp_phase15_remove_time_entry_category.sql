alter table public.time_entries
  drop constraint if exists time_entries_known_category;

alter table public.time_entries
  drop column if exists category;
