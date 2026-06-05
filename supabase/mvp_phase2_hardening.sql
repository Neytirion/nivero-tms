-- Phase 2 hardening for Internal PM Tool MVP
-- Run after:
--   1) supabase/policies_crud.sql
--   2) supabase/mvp_phase1_schema.sql
--   3) supabase/invite_member_by_email.sql

-- ---------------------------------
-- 0) Supporting indexes for RLS
-- ---------------------------------
create unique index if not exists project_members_project_user_uidx
  on public.project_members (project_id, user_id);

create index if not exists project_members_user_project_idx
  on public.project_members (user_id, project_id);

create index if not exists projects_owner_status_idx
  on public.projects (owner_id, status);

create index if not exists tasks_project_status_assignee_idx
  on public.tasks (project_id, status, assigned_to);

create index if not exists tasks_created_by_idx
  on public.tasks (created_by);

create index if not exists task_dependencies_task_idx
  on public.task_dependencies (task_id);

create index if not exists task_dependencies_depends_on_idx
  on public.task_dependencies (depends_on_task_id);

create index if not exists time_entries_project_user_date_idx
  on public.time_entries (project_id, user_id, entry_date);

-- ---------------------------------
-- 1) Data constraints
-- ---------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'project_members_role_check'
  ) then
    alter table public.project_members
      add constraint project_members_role_check
      check (role in ('member', 'admin'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'projects_hours_non_negative_check'
  ) then
    alter table public.projects
      add constraint projects_hours_non_negative_check
      check (
        coalesce(estimated_hours, 0) >= 0
        and coalesce(actual_hours, 0) >= 0
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'projects_dates_order_check'
  ) then
    alter table public.projects
      add constraint projects_dates_order_check
      check (
        start_date is null
        or end_date is null
        or start_date <= end_date
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tasks_status_check'
  ) then
    alter table public.tasks
      add constraint tasks_status_check
      check (status in ('backlog', 'todo', 'in_progress', 'review', 'done', 'completed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tasks_priority_check'
  ) then
    alter table public.tasks
      add constraint tasks_priority_check
      check (priority in ('low', 'medium', 'high'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tasks_hours_non_negative_check'
  ) then
    alter table public.tasks
      add constraint tasks_hours_non_negative_check
      check (
        coalesce(estimate_hours, 0) >= 0
        and coalesce(actual_hours, 0) >= 0
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tasks_blocked_by_not_self_check'
  ) then
    alter table public.tasks
      add constraint tasks_blocked_by_not_self_check
      check (blocked_by_task_id is null or blocked_by_task_id <> id);
  end if;
end
$$;

-- ---------------------------------
-- 2) FK coverage for user references
-- ---------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_owner_id_fkey_auth_users'
  ) then
    alter table public.projects
      add constraint projects_owner_id_fkey_auth_users
      foreign key (owner_id) references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'projects_project_manager_id_fkey_auth_users'
  ) then
    alter table public.projects
      add constraint projects_project_manager_id_fkey_auth_users
      foreign key (project_manager_id) references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'project_members_user_id_fkey_auth_users'
  ) then
    alter table public.project_members
      add constraint project_members_user_id_fkey_auth_users
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tasks_assigned_to_fkey_auth_users'
  ) then
    alter table public.tasks
      add constraint tasks_assigned_to_fkey_auth_users
      foreign key (assigned_to) references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tasks_created_by_fkey_auth_users'
  ) then
    alter table public.tasks
      add constraint tasks_created_by_fkey_auth_users
      foreign key (created_by) references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'task_dependencies_created_by_fkey_auth_users'
  ) then
    alter table public.task_dependencies
      add constraint task_dependencies_created_by_fkey_auth_users
      foreign key (created_by) references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'time_entries_user_id_fkey_auth_users'
  ) then
    alter table public.time_entries
      add constraint time_entries_user_id_fkey_auth_users
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end
$$;

-- ---------------------------------
-- 3) Integrity trigger: task belongs project in time_entries
-- ---------------------------------
create or replace function public.validate_time_entry_task_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_project_id uuid;
begin
  if new.task_id is null then
    return new;
  end if;

  select t.project_id
  into v_task_project_id
  from public.tasks t
  where t.id = new.task_id;

  if v_task_project_id is null then
    raise exception 'Invalid task_id: task not found';
  end if;

  if v_task_project_id <> new.project_id then
    raise exception 'Task and project mismatch in time entry';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_time_entry_task_project on public.time_entries;

create trigger trg_validate_time_entry_task_project
before insert or update on public.time_entries
for each row
execute function public.validate_time_entry_task_project();

-- ---------------------------------
-- 4) Keep updated_at in sync
-- ---------------------------------
create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_tasks_set_updated_at on public.tasks;
create trigger trg_tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_row_updated_at();

drop trigger if exists trg_time_entries_set_updated_at on public.time_entries;
create trigger trg_time_entries_set_updated_at
before update on public.time_entries
for each row
execute function public.set_row_updated_at();

-- ---------------------------------
-- 5) RLS alignment for tasks (owner/admin/member)
-- ---------------------------------
alter table public.tasks enable row level security;

drop policy if exists "User can see tasks in his projects" on public.tasks;
drop policy if exists "User can create tasks" on public.tasks;
drop policy if exists "User can update tasks in member projects" on public.tasks;
drop policy if exists "User can delete tasks in member projects" on public.tasks;

create policy "User can see tasks in his projects"
on public.tasks
for select
to authenticated
using (
  project_id in (
    select p.id
    from public.projects p
    where p.owner_id = auth.uid()
  )
  or project_id in (
    select pm.project_id
    from public.project_members pm
    where pm.user_id = auth.uid()
  )
);

create policy "User can create tasks"
on public.tasks
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    project_id in (
      select p.id
      from public.projects p
      where p.owner_id = auth.uid()
    )
    or project_id in (
      select pm.project_id
      from public.project_members pm
      where pm.user_id = auth.uid()
    )
  )
);

create policy "User can update tasks in member projects"
on public.tasks
for update
to authenticated
using (
  created_by = auth.uid()
  or project_id in (
    select p.id
    from public.projects p
    where p.owner_id = auth.uid()
  )
  or project_id in (
    select pm.project_id
    from public.project_members pm
    where pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
)
with check (
  created_by = auth.uid()
  or project_id in (
    select p.id
    from public.projects p
    where p.owner_id = auth.uid()
  )
  or project_id in (
    select pm.project_id
    from public.project_members pm
    where pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

create policy "User can delete tasks in member projects"
on public.tasks
for delete
to authenticated
using (
  created_by = auth.uid()
  or project_id in (
    select p.id
    from public.projects p
    where p.owner_id = auth.uid()
  )
  or project_id in (
    select pm.project_id
    from public.project_members pm
    where pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

-- ---------------------------------
-- 6) NOTE: optional strictness (manual step)
-- ---------------------------------
-- After you verify there are no null legacy rows, you can enforce stricter model:
-- alter table public.projects alter column owner_id set not null;
-- alter table public.project_members alter column project_id set not null;
-- alter table public.project_members alter column user_id set not null;
-- alter table public.tasks alter column project_id set not null;

notify pgrst, 'reload schema';
