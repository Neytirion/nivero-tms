-- Phase 17: Schema cleanup — remove duplicate FK constraints and harden integrity.
-- Run AFTER diagnostic_schema_check.sql to verify what exists.
-- All operations are idempotent (safe to run multiple times).

-- =============================================
-- PART 1: DROP DUPLICATE FK CONSTRAINTS
-- =============================================
-- Each column that references auth.users accumulated up to 3 FKs across phases:
--   *_fkey           – original, created with the table, NO ON DELETE action (= RESTRICT).
--                      Blocks user deletion. Dangerous.
--   *_fkey_auth_users – added in phase 2 with correct ON DELETE, but now redundant.
--   fk_*             – added in phase 8 with correct ON DELETE. This is the canonical one.
-- We keep fk_* and drop the other two.

-- projects.owner_id
alter table public.projects drop constraint if exists projects_owner_id_fkey;
alter table public.projects drop constraint if exists projects_owner_id_fkey_auth_users;

-- projects.project_manager_id
alter table public.projects drop constraint if exists projects_project_manager_id_fkey;
alter table public.projects drop constraint if exists projects_project_manager_id_fkey_auth_users;

-- tasks.assigned_to
alter table public.tasks drop constraint if exists tasks_assigned_to_fkey;
alter table public.tasks drop constraint if exists tasks_assigned_to_fkey_auth_users;

-- tasks.created_by
alter table public.tasks drop constraint if exists tasks_created_by_fkey;
alter table public.tasks drop constraint if exists tasks_created_by_fkey_auth_users;

-- project_members.user_id
alter table public.project_members drop constraint if exists project_members_user_id_fkey;
alter table public.project_members drop constraint if exists project_members_user_id_fkey_auth_users;

-- task_dependencies.created_by
alter table public.task_dependencies drop constraint if exists task_dependencies_created_by_fkey;
alter table public.task_dependencies drop constraint if exists task_dependencies_created_by_fkey_auth_users;

-- time_entries.user_id
alter table public.time_entries drop constraint if exists time_entries_user_id_fkey;
alter table public.time_entries drop constraint if exists time_entries_user_id_fkey_auth_users;

-- comments.user_id (only 2 existed: _fkey + fk_*)
alter table public.comments drop constraint if exists comments_user_id_fkey;

-- project_documents.user_id (only 2 existed: _fkey + fk_*)
alter table public.project_documents drop constraint if exists project_documents_user_id_fkey;

-- =============================================
-- PART 2: ENSURE CANONICAL FK_* CONSTRAINTS EXIST
-- =============================================
-- Guards against the case where phase 8 was never run on this database.

do $$
begin
  -- projects.owner_id → ON DELETE SET NULL
  if not exists (select 1 from pg_constraint where conname = 'fk_projects_owner_id') then
    alter table public.projects
      add constraint fk_projects_owner_id
      foreign key (owner_id) references auth.users(id) on delete set null;
  end if;

  -- projects.project_manager_id → ON DELETE SET NULL
  if not exists (select 1 from pg_constraint where conname = 'fk_projects_project_manager_id') then
    alter table public.projects
      add constraint fk_projects_project_manager_id
      foreign key (project_manager_id) references auth.users(id) on delete set null;
  end if;

  -- tasks.assigned_to → ON DELETE SET NULL
  if not exists (select 1 from pg_constraint where conname = 'fk_tasks_assigned_to') then
    alter table public.tasks
      add constraint fk_tasks_assigned_to
      foreign key (assigned_to) references auth.users(id) on delete set null;
  end if;

  -- tasks.created_by → ON DELETE SET NULL
  if not exists (select 1 from pg_constraint where conname = 'fk_tasks_created_by') then
    alter table public.tasks
      add constraint fk_tasks_created_by
      foreign key (created_by) references auth.users(id) on delete set null;
  end if;

  -- project_members.user_id → ON DELETE CASCADE (removing a user removes their memberships)
  if not exists (select 1 from pg_constraint where conname = 'fk_project_members_user_id') then
    alter table public.project_members
      add constraint fk_project_members_user_id
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  -- task_dependencies.created_by → ON DELETE SET NULL
  if not exists (select 1 from pg_constraint where conname = 'fk_task_dependencies_created_by') then
    alter table public.task_dependencies
      add constraint fk_task_dependencies_created_by
      foreign key (created_by) references auth.users(id) on delete set null;
  end if;

  -- time_entries.user_id → ON DELETE CASCADE
  if not exists (select 1 from pg_constraint where conname = 'fk_time_entries_user_id') then
    alter table public.time_entries
      add constraint fk_time_entries_user_id
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  -- comments.user_id → ON DELETE CASCADE
  if not exists (select 1 from pg_constraint where conname = 'fk_comments_user_id') then
    alter table public.comments
      add constraint fk_comments_user_id
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  -- project_documents.user_id → ON DELETE CASCADE
  if not exists (select 1 from pg_constraint where conname = 'fk_project_documents_user_id') then
    alter table public.project_documents
      add constraint fk_project_documents_user_id
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  -- estimates.created_by → ON DELETE SET NULL
  if not exists (select 1 from pg_constraint where conname = 'fk_estimates_created_by') then
    alter table public.estimates
      add constraint fk_estimates_created_by
      foreign key (created_by) references auth.users(id) on delete set null;
  end if;
end
$$;

-- =============================================
-- PART 3: UNIQUE INDEX ON project_members
-- =============================================
-- Required for ON CONFLICT (project_id, user_id) in invite_project_member_by_email.

create unique index if not exists project_members_project_user_uidx
  on public.project_members (project_id, user_id);

-- =============================================
-- PART 4: DATA INTEGRITY CONSTRAINTS
-- =============================================

do $$
begin
  -- task_dependencies: prevent self-reference
  if not exists (select 1 from pg_constraint where conname = 'task_dependencies_not_self') then
    alter table public.task_dependencies
      add constraint task_dependencies_not_self
      check (task_id <> depends_on_task_id);
  end if;

  -- task_dependencies: prevent duplicate pairs
  if not exists (select 1 from pg_constraint where conname = 'task_dependencies_unique_pair') then
    alter table public.task_dependencies
      add constraint task_dependencies_unique_pair
      unique (task_id, depends_on_task_id);
  end if;

  -- projects: start_date must be before end_date
  if not exists (select 1 from pg_constraint where conname = 'projects_dates_order_check') then
    alter table public.projects
      add constraint projects_dates_order_check
      check (start_date is null or end_date is null or start_date <= end_date);
  end if;

  -- projects: no negative hours
  if not exists (select 1 from pg_constraint where conname = 'projects_hours_non_negative_check') then
    alter table public.projects
      add constraint projects_hours_non_negative_check
      check (
        coalesce(estimated_hours, 0) >= 0
        and coalesce(actual_hours, 0) >= 0
      );
  end if;

  -- tasks: cannot be blocked by itself
  if not exists (select 1 from pg_constraint where conname = 'tasks_blocked_by_not_self_check') then
    alter table public.tasks
      add constraint tasks_blocked_by_not_self_check
      check (blocked_by_task_id is null or blocked_by_task_id <> id);
  end if;

  -- tasks: no negative hours
  if not exists (select 1 from pg_constraint where conname = 'tasks_hours_non_negative_check') then
    alter table public.tasks
      add constraint tasks_hours_non_negative_check
      check (
        coalesce(estimate_hours, 0) >= 0
        and coalesce(actual_hours, 0) >= 0
      );
  end if;

  -- project_members: role must be a valid value
  -- Drop old constraint first (phase 2 allowed only 'member' and 'admin', phase 10 added 'manager')
  -- Phase 10 already handles this, but guard here too.
  if not exists (select 1 from pg_constraint where conname = 'project_members_role_check') then
    alter table public.project_members
      add constraint project_members_role_check
      check (lower(coalesce(role, '')) in ('member', 'admin', 'manager'));
  end if;
end
$$;

-- =============================================
-- PART 5: ENSURE RLS IS ENABLED ON ALL TABLES
-- =============================================

alter table public.projects          enable row level security;
alter table public.tasks             enable row level security;
alter table public.project_members   enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.time_entries      enable row level security;
alter table public.estimates         enable row level security;
alter table public.work_packages     enable row level security;
alter table public.comments          enable row level security;
alter table public.comment_mentions  enable row level security;
alter table public.activity_events   enable row level security;
alter table public.project_documents enable row level security;
alter table public.project_wiki_pages enable row level security;

-- =============================================
-- PART 6: SUPPORTING PERFORMANCE INDEXES
-- =============================================

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

create index if not exists time_entries_user_date_idx
  on public.time_entries (user_id, entry_date);

create index if not exists comments_user_id_idx
  on public.comments (user_id);

create index if not exists project_documents_user_id_idx
  on public.project_documents (user_id);

create index if not exists tasks_assigned_to_idx
  on public.tasks (assigned_to);

-- =============================================
-- DONE — reload PostgREST schema cache
-- =============================================

notify pgrst, 'reload schema';
