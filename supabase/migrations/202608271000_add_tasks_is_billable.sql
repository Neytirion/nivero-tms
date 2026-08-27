-- Add is_billable column to tasks table
-- Default to true for all existing and new tasks

alter table public.tasks add column if not exists is_billable boolean not null default true;

-- Create index for billable filtering if needed
create index if not exists tasks_is_billable_idx on public.tasks(is_billable);
