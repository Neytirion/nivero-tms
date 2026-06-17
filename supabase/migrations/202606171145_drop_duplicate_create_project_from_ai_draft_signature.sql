drop function if exists public.create_project_from_ai_draft(
  text,
  jsonb,
  jsonb,
  text,
  date,
  date,
  numeric,
  numeric
);

notify pgrst, 'reload schema';