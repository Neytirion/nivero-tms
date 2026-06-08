-- Phase 14: Collaboration foundation (@mentions, activity feed, wiki).

-- ---------------------------------
-- 1) Comment mentions
-- ---------------------------------
create table if not exists public.comment_mentions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  mentioned_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint comment_mentions_unique unique (comment_id, mentioned_user_id)
);

create index if not exists comment_mentions_project_created_idx
  on public.comment_mentions (project_id, created_at desc);

create index if not exists comment_mentions_mentioned_user_idx
  on public.comment_mentions (mentioned_user_id, created_at desc);

-- ---------------------------------
-- 2) Activity feed
-- ---------------------------------
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now(),
  constraint activity_events_event_type_not_empty check (length(trim(event_type)) > 0),
  constraint activity_events_entity_type_not_empty check (length(trim(entity_type)) > 0)
);

create index if not exists activity_events_project_created_idx
  on public.activity_events (project_id, created_at desc);

-- ---------------------------------
-- 3) Project wiki page
-- ---------------------------------
create table if not exists public.project_wiki_pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null default 'Project Wiki',
  content text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_wiki_pages_project_unique unique (project_id)
);

create or replace function public.set_project_wiki_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_project_wiki_set_updated_at on public.project_wiki_pages;
create trigger trg_project_wiki_set_updated_at
before update on public.project_wiki_pages
for each row
execute function public.set_project_wiki_updated_at();

-- ---------------------------------
-- 4) RLS
-- ---------------------------------
alter table public.comment_mentions enable row level security;
alter table public.activity_events enable row level security;
alter table public.project_wiki_pages enable row level security;

-- Comment mentions are visible to project members and owner.
drop policy if exists "Comment mentions visible to project members" on public.comment_mentions;
create policy "Comment mentions visible to project members"
on public.comment_mentions
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = comment_mentions.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = comment_mentions.project_id
      and pm.user_id = auth.uid()
  )
);

drop policy if exists "Comment mentions insert by project members" on public.comment_mentions;
create policy "Comment mentions insert by project members"
on public.comment_mentions
for insert
to authenticated
with check (
  mentioned_by_user_id = auth.uid()
  and (
    exists (
      select 1
      from public.projects p
      where p.id = comment_mentions.project_id
        and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = comment_mentions.project_id
        and pm.user_id = auth.uid()
    )
  )
);

-- Activity feed entries are visible to project members and owner.
drop policy if exists "Activity events visible to project members" on public.activity_events;
create policy "Activity events visible to project members"
on public.activity_events
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = activity_events.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = activity_events.project_id
      and pm.user_id = auth.uid()
  )
);

drop policy if exists "Activity events insert by project members" on public.activity_events;
create policy "Activity events insert by project members"
on public.activity_events
for insert
to authenticated
with check (
  coalesce(actor_user_id, auth.uid()) = auth.uid()
  and (
    exists (
      select 1
      from public.projects p
      where p.id = activity_events.project_id
        and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = activity_events.project_id
        and pm.user_id = auth.uid()
    )
  )
);

-- Wiki is readable by all project members, editable by owner/admin/manager.
drop policy if exists "Project wiki visible to project members" on public.project_wiki_pages;
create policy "Project wiki visible to project members"
on public.project_wiki_pages
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_wiki_pages.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_wiki_pages.project_id
      and pm.user_id = auth.uid()
  )
);

drop policy if exists "Project wiki insert by managers" on public.project_wiki_pages;
create policy "Project wiki insert by managers"
on public.project_wiki_pages
for insert
to authenticated
with check (
  updated_by = auth.uid()
  and (
    exists (
      select 1
      from public.projects p
      where p.id = project_wiki_pages.project_id
        and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = project_wiki_pages.project_id
        and pm.user_id = auth.uid()
        and lower(coalesce(pm.role, '')) in ('admin', 'manager')
    )
  )
);

drop policy if exists "Project wiki update by managers" on public.project_wiki_pages;
create policy "Project wiki update by managers"
on public.project_wiki_pages
for update
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_wiki_pages.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_wiki_pages.project_id
      and pm.user_id = auth.uid()
      and lower(coalesce(pm.role, '')) in ('admin', 'manager')
  )
)
with check (
  updated_by = auth.uid()
  and (
    exists (
      select 1
      from public.projects p
      where p.id = project_wiki_pages.project_id
        and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = project_wiki_pages.project_id
        and pm.user_id = auth.uid()
        and lower(coalesce(pm.role, '')) in ('admin', 'manager')
    )
  )
);

notify pgrst, 'reload schema';
