-- Phase 23: Make estimates module optional per project
-- Add use_estimates column to projects table to allow projects to work without strict estimate versioning

alter table public.projects
add column use_estimates boolean not null default false;

-- Refresh schema cache
notify pgrst, 'reload schema';
