-- Phase 4: Core flow completion (comments, documents, automatic rollups)
-- Run after phase1/phase2/phase3 scripts.

-- ---------------------------------
-- 1) Task comments
-- ---------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  constraint comments_message_not_empty check (length(trim(message)) > 0)
);

create index if not exists comments_task_created_idx
  on public.comments (task_id, created_at);

create index if not exists comments_project_created_idx
  on public.comments (project_id, created_at);

alter table public.comments enable row level security;

drop policy if exists "Comments visible to project members" on public.comments;
create policy "Comments visible to project members"
on public.comments
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = comments.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = comments.project_id
      and pm.user_id = auth.uid()
  )
);

drop policy if exists "Comments insert by project members" on public.comments;
create policy "Comments insert by project members"
on public.comments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1
      from public.projects p
      where p.id = comments.project_id
        and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = comments.project_id
        and pm.user_id = auth.uid()
    )
  )
);

-- ---------------------------------
-- 2) Project documents + storage
-- ---------------------------------
create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_url text not null,
  name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists project_documents_project_created_idx
  on public.project_documents (project_id, created_at desc);

alter table public.project_documents enable row level security;

drop policy if exists "Project documents visible to members" on public.project_documents;
create policy "Project documents visible to members"
on public.project_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_documents.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_documents.project_id
      and pm.user_id = auth.uid()
  )
);

drop policy if exists "Project documents insert by members" on public.project_documents;
create policy "Project documents insert by members"
on public.project_documents
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1
      from public.projects p
      where p.id = project_documents.project_id
        and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = project_documents.project_id
        and pm.user_id = auth.uid()
    )
  )
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-documents', 'project-documents', true, 52428800)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "Project docs public read" on storage.objects;
create policy "Project docs public read"
on storage.objects
for select
to public
using (bucket_id = 'project-documents');

drop policy if exists "Project docs upload by authenticated" on storage.objects;
create policy "Project docs upload by authenticated"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'project-documents');

drop policy if exists "Project docs update by authenticated" on storage.objects;
create policy "Project docs update by authenticated"
on storage.objects
for update
to authenticated
using (bucket_id = 'project-documents')
with check (bucket_id = 'project-documents');

drop policy if exists "Project docs delete by authenticated" on storage.objects;
create policy "Project docs delete by authenticated"
on storage.objects
for delete
to authenticated
using (bucket_id = 'project-documents');

-- ---------------------------------
-- 3) Automatic rollups from time entries
-- ---------------------------------
create or replace function public.recalculate_task_actual_hours(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_minutes int;
begin
  if p_task_id is null then
    return;
  end if;

  select coalesce(sum(te.minutes_spent), 0)
  into v_minutes
  from public.time_entries te
  where te.task_id = p_task_id;

  update public.tasks
  set actual_hours = round((v_minutes::numeric / 60.0), 2)
  where id = p_task_id;
end;
$$;

create or replace function public.recalculate_project_actual_hours(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_minutes int;
  v_estimated numeric;
  v_actual numeric;
  v_risk text;
begin
  if p_project_id is null then
    return;
  end if;

  select coalesce(sum(te.minutes_spent), 0)
  into v_minutes
  from public.time_entries te
  where te.project_id = p_project_id;

  v_actual := round((v_minutes::numeric / 60.0), 2);

  select coalesce(p.estimated_hours, 0)
  into v_estimated
  from public.projects p
  where p.id = p_project_id;

  if v_estimated <= 0 then
    v_risk := 'green';
  elsif v_actual > v_estimated then
    v_risk := 'red';
  elsif v_actual >= v_estimated * 0.85 then
    v_risk := 'yellow';
  else
    v_risk := 'green';
  end if;

  update public.projects
  set
    actual_hours = v_actual,
    risk_status = v_risk
  where id = p_project_id;
end;
$$;

create or replace function public.time_entries_rollup_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.recalculate_task_actual_hours(new.task_id);
    perform public.recalculate_project_actual_hours(new.project_id);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.task_id is distinct from new.task_id then
      perform public.recalculate_task_actual_hours(old.task_id);
    end if;

    if old.project_id is distinct from new.project_id then
      perform public.recalculate_project_actual_hours(old.project_id);
    end if;

    perform public.recalculate_task_actual_hours(new.task_id);
    perform public.recalculate_project_actual_hours(new.project_id);
    return new;
  end if;

  perform public.recalculate_task_actual_hours(old.task_id);
  perform public.recalculate_project_actual_hours(old.project_id);
  return old;
end;
$$;

drop trigger if exists trg_time_entries_rollup on public.time_entries;
create trigger trg_time_entries_rollup
after insert or update or delete on public.time_entries
for each row
execute function public.time_entries_rollup_trigger();

notify pgrst, 'reload schema';
