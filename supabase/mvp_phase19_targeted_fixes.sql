-- Phase 19: Targeted fixes for remaining schema gaps after phase 17.
-- Run after phase 17 and phase 18.
-- All operations are idempotent.

-- =============================================
-- 1) estimates: drop the leftover duplicate FK
-- =============================================
-- Phase 17 missed this pair (estimates had its own original _fkey from phase 8).
-- estimates_created_by_fkey has NO ON DELETE action and blocks user deletion.

alter table public.estimates drop constraint if exists estimates_created_by_fkey;

-- Ensure the canonical constraint exists with correct ON DELETE.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_estimates_created_by') then
    alter table public.estimates
      add constraint fk_estimates_created_by
      foreign key (created_by) references auth.users(id) on delete set null;
  end if;
end
$$;

-- =============================================
-- 2) Integrity constraints that phase 17 skipped
--    because the table already had unnamed inline checks.
--    Using NOT VALID so they don't fail on existing data,
--    then VALIDATE immediately — safe if diagnostic returned 0 rows.
-- =============================================

-- task_dependencies: self-reference guard
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'task_dependencies_not_self'
  ) then
    alter table public.task_dependencies
      add constraint task_dependencies_not_self
      check (task_id <> depends_on_task_id) not valid;
    alter table public.task_dependencies
      validate constraint task_dependencies_not_self;
  end if;
end
$$;

-- task_dependencies: no duplicate pairs
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'task_dependencies_unique_pair'
  ) then
    alter table public.task_dependencies
      add constraint task_dependencies_unique_pair
      unique (task_id, depends_on_task_id);
  end if;
end
$$;

-- projects: start_date must not be after end_date
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_dates_order_check'
  ) then
    alter table public.projects
      add constraint projects_dates_order_check
      check (start_date is null or end_date is null or start_date <= end_date) not valid;
    alter table public.projects
      validate constraint projects_dates_order_check;
  end if;
end
$$;

-- projects: no negative hours
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_hours_non_negative_check'
  ) then
    alter table public.projects
      add constraint projects_hours_non_negative_check
      check (
        coalesce(estimated_hours, 0) >= 0
        and coalesce(actual_hours, 0) >= 0
      ) not valid;
    alter table public.projects
      validate constraint projects_hours_non_negative_check;
  end if;
end
$$;

-- tasks: cannot be blocked by itself
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_blocked_by_not_self_check'
  ) then
    alter table public.tasks
      add constraint tasks_blocked_by_not_self_check
      check (blocked_by_task_id is null or blocked_by_task_id <> id) not valid;
    alter table public.tasks
      validate constraint tasks_blocked_by_not_self_check;
  end if;
end
$$;

-- tasks: no negative hours
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_hours_non_negative_check'
  ) then
    alter table public.tasks
      add constraint tasks_hours_non_negative_check
      check (
        coalesce(estimate_hours, 0) >= 0
        and coalesce(actual_hours, 0) >= 0
      ) not valid;
    alter table public.tasks
      validate constraint tasks_hours_non_negative_check;
  end if;
end
$$;

-- =============================================
-- 3) comment_mentions: unique per comment+user
-- =============================================
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'comment_mentions_unique'
  ) then
    alter table public.comment_mentions
      add constraint comment_mentions_unique
      unique (comment_id, mentioned_user_id);
  end if;
end
$$;

-- =============================================
-- DONE
-- =============================================

notify pgrst, 'reload schema';
