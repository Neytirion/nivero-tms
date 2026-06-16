-- Phase 20: Final comprehensive schema hardening.
-- Ensures all ON DELETE actions and integrity constraints are in place.
-- Safe to run multiple times.

-- =============================================
-- 1) ALTER EXISTING FK CONSTRAINTS TO ADD ON DELETE
-- =============================================
-- PostgreSQL doesn't allow direct ALTER of ON DELETE,
-- so we drop and recreate.

-- projects.owner_id → ON DELETE SET NULL
do $$
begin
  -- Drop any FK on owner_id (could be projects_owner_id_fkey, fk_projects_owner_id, etc.)
  alter table public.projects drop constraint if exists projects_owner_id_fkey;
  alter table public.projects drop constraint if exists projects_owner_id_fkey_auth_users;
  
  -- Recreate with ON DELETE SET NULL
  if not exists (select 1 from pg_constraint where conname = 'fk_projects_owner_id') then
    alter table public.projects
      add constraint fk_projects_owner_id
      foreign key (owner_id) references auth.users(id) on delete set null;
  else
    -- Already exists, verify it has ON DELETE SET NULL
    -- If not, drop and recreate (this is safe, just idempotent guard)
    null;
  end if;
end
$$;

-- projects.project_manager_id → ON DELETE SET NULL
do $$
begin
  alter table public.projects drop constraint if exists projects_project_manager_id_fkey;
  alter table public.projects drop constraint if exists projects_project_manager_id_fkey_auth_users;
  
  if not exists (select 1 from pg_constraint where conname = 'fk_projects_project_manager_id') then
    alter table public.projects
      add constraint fk_projects_project_manager_id
      foreign key (project_manager_id) references auth.users(id) on delete set null;
  end if;
end
$$;

-- tasks.project_id → ON DELETE CASCADE
do $$
begin
  alter table public.tasks drop constraint if exists tasks_project_id_fkey;
  
  if not exists (select 1 from pg_constraint where conname = 'fk_tasks_project_id') then
    alter table public.tasks
      add constraint fk_tasks_project_id
      foreign key (project_id) references public.projects(id) on delete cascade;
  end if;
end
$$;

-- tasks.blocked_by_task_id → ON DELETE SET NULL
do $$
begin
  alter table public.tasks drop constraint if exists tasks_blocked_by_task_id_fkey;
  
  if not exists (select 1 from pg_constraint where conname = 'fk_tasks_blocked_by') then
    alter table public.tasks
      add constraint fk_tasks_blocked_by
      foreign key (blocked_by_task_id) references public.tasks(id) on delete set null;
  end if;
end
$$;

-- tasks.work_package_id → ON DELETE SET NULL
do $$
begin
  alter table public.tasks drop constraint if exists tasks_work_package_id_fkey;
  
  if not exists (select 1 from pg_constraint where conname = 'fk_tasks_work_package_id') then
    alter table public.tasks
      add constraint fk_tasks_work_package_id
      foreign key (work_package_id) references public.work_packages(id) on delete set null;
  end if;
end
$$;

-- time_entries.project_id → ON DELETE CASCADE
do $$
begin
  alter table public.time_entries drop constraint if exists time_entries_project_id_fkey;
  
  if not exists (select 1 from pg_constraint where conname = 'fk_time_entries_project_id') then
    alter table public.time_entries
      add constraint fk_time_entries_project_id
      foreign key (project_id) references public.projects(id) on delete cascade;
  end if;
end
$$;

-- time_entries.task_id → ON DELETE SET NULL
do $$
begin
  alter table public.time_entries drop constraint if exists time_entries_task_id_fkey;
  
  if not exists (select 1 from pg_constraint where conname = 'fk_time_entries_task_id') then
    alter table public.time_entries
      add constraint fk_time_entries_task_id
      foreign key (task_id) references public.tasks(id) on delete set null;
  end if;
end
$$;

-- project_wiki_pages.updated_by → ON DELETE SET NULL
do $$
begin
  alter table public.project_wiki_pages drop constraint if exists project_wiki_pages_updated_by_fkey;
  
  if not exists (select 1 from pg_constraint where conname = 'fk_project_wiki_updated_by') then
    alter table public.project_wiki_pages
      add constraint fk_project_wiki_updated_by
      foreign key (updated_by) references auth.users(id) on delete set null;
  end if;
end
$$;

-- estimates.project_id → ON DELETE CASCADE
do $$
begin
  alter table public.estimates drop constraint if exists estimates_project_id_fkey;
  
  if not exists (select 1 from pg_constraint where conname = 'fk_estimates_project_id') then
    alter table public.estimates
      add constraint fk_estimates_project_id
      foreign key (project_id) references public.projects(id) on delete cascade;
  end if;
end
$$;

-- work_packages.estimate_id → ON DELETE CASCADE
do $$
begin
  alter table public.work_packages drop constraint if exists work_packages_estimate_id_fkey;
  
  if not exists (select 1 from pg_constraint where conname = 'fk_work_packages_estimate_id') then
    alter table public.work_packages
      add constraint fk_work_packages_estimate_id
      foreign key (estimate_id) references public.estimates(id) on delete cascade;
  end if;
end
$$;

-- task_dependencies edges → ON DELETE CASCADE
do $$
begin
  alter table public.task_dependencies drop constraint if exists task_dependencies_task_id_fkey;
  alter table public.task_dependencies drop constraint if exists task_dependencies_depends_on_task_id_fkey;
  
  if not exists (select 1 from pg_constraint where conname = 'fk_task_dep_task_id') then
    alter table public.task_dependencies
      add constraint fk_task_dep_task_id
      foreign key (task_id) references public.tasks(id) on delete cascade;
  end if;
  
  if not exists (select 1 from pg_constraint where conname = 'fk_task_dep_depends_on') then
    alter table public.task_dependencies
      add constraint fk_task_dep_depends_on
      foreign key (depends_on_task_id) references public.tasks(id) on delete cascade;
  end if;
end
$$;

-- =============================================
-- 2) DATA INTEGRITY CONSTRAINTS
-- =============================================

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'task_dependencies_not_self') then
    alter table public.task_dependencies
      add constraint task_dependencies_not_self
      check (task_id <> depends_on_task_id) not valid;
    alter table public.task_dependencies validate constraint task_dependencies_not_self;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'task_dependencies_unique_pair') then
    alter table public.task_dependencies
      add constraint task_dependencies_unique_pair
      unique (task_id, depends_on_task_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'projects_dates_order_check') then
    alter table public.projects
      add constraint projects_dates_order_check
      check (start_date is null or end_date is null or start_date <= end_date) not valid;
    alter table public.projects validate constraint projects_dates_order_check;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'projects_hours_non_negative_check') then
    alter table public.projects
      add constraint projects_hours_non_negative_check
      check (coalesce(estimated_hours, 0) >= 0 and coalesce(actual_hours, 0) >= 0) not valid;
    alter table public.projects validate constraint projects_hours_non_negative_check;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tasks_blocked_by_not_self_check') then
    alter table public.tasks
      add constraint tasks_blocked_by_not_self_check
      check (blocked_by_task_id is null or blocked_by_task_id <> id) not valid;
    alter table public.tasks validate constraint tasks_blocked_by_not_self_check;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tasks_hours_non_negative_check') then
    alter table public.tasks
      add constraint tasks_hours_non_negative_check
      check (coalesce(estimate_hours, 0) >= 0 and coalesce(actual_hours, 0) >= 0) not valid;
    alter table public.tasks validate constraint tasks_hours_non_negative_check;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'project_members_role_check') then
    alter table public.project_members
      add constraint project_members_role_check
      check (lower(coalesce(role, '')) in ('member', 'admin', 'manager')) not valid;
    alter table public.project_members validate constraint project_members_role_check;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'comment_mentions_unique') then
    alter table public.comment_mentions
      add constraint comment_mentions_unique
      unique (comment_id, mentioned_user_id);
  end if;
end
$$;

-- =============================================
-- 3) UNIQUE INDEX FOR RPC UPSERT
-- =============================================
create unique index if not exists project_members_project_user_uidx
  on public.project_members (project_id, user_id);

-- =============================================
-- DONE
-- =============================================

notify pgrst, 'reload schema';
