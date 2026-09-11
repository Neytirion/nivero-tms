-- Remove duplicate unique objects left by earlier schema evolution.
-- Keep the canonical constraints introduced by phase24_db_integrity_constraints.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'uq_comment_mention'
      and conrelid = 'public.comment_mentions'::regclass
  ) then
    raise exception 'Canonical constraint uq_comment_mention is missing';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'uq_estimates_version'
      and conrelid = 'public.estimates'::regclass
  ) then
    raise exception 'Canonical constraint uq_estimates_version is missing';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'uq_task_dependency'
      and conrelid = 'public.task_dependencies'::regclass
  ) then
    raise exception 'Canonical constraint uq_task_dependency is missing';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'uq_project_members_user'
      and conrelid = 'public.project_members'::regclass
  ) then
    raise exception 'Canonical constraint uq_project_members_user is missing';
  end if;
end;
$$;

alter table public.comment_mentions
  drop constraint if exists comment_mentions_unique;

alter table public.estimates
  drop constraint if exists estimates_project_version_unique;

alter table public.task_dependencies
  drop constraint if exists task_dependencies_unique_pair;

-- The canonical uq_project_members_user constraint already provides the same
-- uniqueness guarantee as this standalone index.
drop index if exists public.project_members_project_user_uidx;

commit;

notify pgrst, 'reload schema';
