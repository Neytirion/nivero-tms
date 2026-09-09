-- Remove the retired AI project creation RPC.

drop function if exists public.create_project_from_ai_draft(
  text,
  text,
  date,
  date,
  numeric,
  numeric,
  jsonb,
  jsonb
);