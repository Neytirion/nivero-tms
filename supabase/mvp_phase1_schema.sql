-- Phase 1 foundation schema for Internal PM Tool MVP
-- Run after base schema and policies_crud.sql

-- -------------------------
-- Projects: extended fields
-- -------------------------
alter table public.projects add column if not exists customer_name text;
alter table public.projects add column if not exists project_manager_id uuid references auth.users(id);
alter table public.projects add column if not exists start_date date;
alter table public.projects add column if not exists end_date date;
alter table public.projects add column if not exists estimated_hours numeric(10,2) default 0;
alter table public.projects add column if not exists actual_hours numeric(10,2) default 0;
alter table public.projects add column if not exists progress_percent numeric(5,2) default 0;
alter table public.projects add column if not exists budget_amount numeric(12,2);
alter table public.projects add column if not exists risk_status text default 'green';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_progress_percent_check'
  ) then
    alter table public.projects
      add constraint projects_progress_percent_check
      check (progress_percent >= 0 and progress_percent <= 100);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'projects_risk_status_check'
  ) then
    alter table public.projects
      add constraint projects_risk_status_check
      check (risk_status in ('green', 'yellow', 'red'));
  end if;
end
$$;

-- -------------------------
-- Tasks: estimation fields
-- -------------------------
alter table public.tasks add column if not exists estimate_hours numeric(10,2) default 0;
alter table public.tasks add column if not exists actual_hours numeric(10,2) default 0;
alter table public.tasks add column if not exists blocked_by_task_id uuid references public.tasks(id) on delete set null;

-- -------------------------
-- Task dependencies (many-to-many)
-- -------------------------
create table if not exists public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks(id) on delete cascade,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint task_dependencies_not_self check (task_id <> depends_on_task_id),
  constraint task_dependencies_unique_pair unique (task_id, depends_on_task_id)
);

alter table public.task_dependencies enable row level security;

drop policy if exists "Task deps visible to members" on public.task_dependencies;
drop policy if exists "Task deps insert by members" on public.task_dependencies;
drop policy if exists "Task deps delete by owner/admin" on public.task_dependencies;

create policy "Task deps visible to members"
on public.task_dependencies
for select
to authenticated
using (
  exists (
    select 1
    from public.tasks t
    left join public.projects p on p.id = t.project_id
    left join public.project_members pm on pm.project_id = t.project_id and pm.user_id = auth.uid()
    where t.id = task_dependencies.task_id
      and (p.owner_id = auth.uid() or pm.user_id is not null)
  )
);

create policy "Task deps insert by members"
on public.task_dependencies
for insert
to authenticated
with check (
  exists (
    select 1
    from public.tasks t
    left join public.projects p on p.id = t.project_id
    left join public.project_members pm on pm.project_id = t.project_id and pm.user_id = auth.uid()
    where t.id = task_dependencies.task_id
      and (p.owner_id = auth.uid() or pm.user_id is not null)
  )
);

create policy "Task deps delete by owner/admin"
on public.task_dependencies
for delete
to authenticated
using (
  exists (
    select 1
    from public.tasks t
    left join public.projects p on p.id = t.project_id
    left join public.project_members pm on pm.project_id = t.project_id and pm.user_id = auth.uid()
    where t.id = task_dependencies.task_id
      and (
        p.owner_id = auth.uid()
        or coalesce(pm.role, 'member') = 'admin'
      )
  )
);

-- -------------------------
-- Time tracking
-- -------------------------
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  entry_date date not null default current_date,
  minutes_spent integer not null,
  is_billable boolean not null default true,
  category text not null default 'delivery',
  notes text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_entries_minutes_positive check (minutes_spent > 0),
  constraint time_entries_known_category check (category in ('delivery', 'meeting', 'support', 'admin', 'research'))
);

create index if not exists time_entries_user_date_idx on public.time_entries(user_id, entry_date);
create index if not exists time_entries_project_date_idx on public.time_entries(project_id, entry_date);

alter table public.time_entries enable row level security;

drop policy if exists "Time entries visible to members" on public.time_entries;
drop policy if exists "Users insert own time entries" on public.time_entries;
drop policy if exists "Users update own time entries" on public.time_entries;
drop policy if exists "Users delete own time entries" on public.time_entries;

create policy "Time entries visible to members"
on public.time_entries
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.projects p
    where p.id = time_entries.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = time_entries.project_id
      and pm.user_id = auth.uid()
  )
);

create policy "Users insert own time entries"
on public.time_entries
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1
      from public.projects p
      where p.id = time_entries.project_id
        and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = time_entries.project_id
        and pm.user_id = auth.uid()
    )
  )
);

create policy "Users update own time entries"
on public.time_entries
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users delete own time entries"
on public.time_entries
for delete
to authenticated
using (user_id = auth.uid());

notify pgrst, 'reload schema';
