-- Run this script in Supabase SQL Editor to enable CRUD from the app.

alter table projects add column if not exists status text default 'active';
alter table projects add column if not exists completed_at timestamptz;
alter table projects add column if not exists deadline_at date;
update projects set status = 'active' where status is null;
alter table projects alter column status set default 'active';
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_status_check'
  ) then
    alter table projects add constraint projects_status_check check (status in ('active', 'completed'));
  end if;
end
$$;

create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from projects
    where id = p_project_id
      and owner_id = auth.uid()
  );
$$;

revoke all on function public.is_project_owner(uuid) from public;
grant execute on function public.is_project_owner(uuid) to authenticated;

create or replace function public.get_project_members_with_profile(p_project_id uuid)
returns table (
  member_id uuid,
  project_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  full_name text,
  email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and (
        p.owner_id = v_actor_id
        or exists (
          select 1
          from public.project_members pm
          where pm.project_id = p_project_id
            and pm.user_id = v_actor_id
        )
      )
  ) then
    raise exception 'Access denied to project members list';
  end if;

  return query
  select
    pm.id::uuid as member_id,
    pm.project_id::uuid as project_id,
    pm.user_id::uuid as user_id,
    pm.role::text as role,
    pm.created_at::timestamptz as joined_at,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(u.email::text, ''), '@', 1),
      'Unknown user'
    )::text as full_name,
    u.email::text as email
  from public.project_members pm
  left join auth.users u on u.id = pm.user_id
  where pm.project_id = p_project_id
  order by pm.created_at asc;
end;
$$;

revoke all on function public.get_project_members_with_profile(uuid) from public;
grant execute on function public.get_project_members_with_profile(uuid) to authenticated;

alter table projects enable row level security;
alter table tasks enable row level security;
alter table project_members enable row level security;

create unique index if not exists project_members_project_user_uidx
  on public.project_members (project_id, user_id);

create or replace function public.ensure_project_owner_admin_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is null then
    return new;
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'admin')
  on conflict (project_id, user_id)
  do update set role = 'admin';

  return new;
end;
$$;

drop trigger if exists trg_projects_owner_admin_membership on public.projects;

create trigger trg_projects_owner_admin_membership
after insert on public.projects
for each row
execute function public.ensure_project_owner_admin_membership();

drop policy if exists "User can see own projects" on projects;
drop policy if exists "User can see projects where he is member" on projects;
drop policy if exists "User can create own projects" on projects;
drop policy if exists "User can update own projects" on projects;
drop policy if exists "User can delete own projects" on projects;

create policy "User can see projects where he is member"
on projects
for select
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from project_members pm
    where pm.project_id = projects.id
      and pm.user_id = auth.uid()
  )
);

create policy "User can create own projects"
on projects
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "User can update own projects"
on projects
for update
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from project_members pm
    where pm.project_id = projects.id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
)
with check (
  owner_id = auth.uid()
  or exists (
    select 1
    from project_members pm
    where pm.project_id = projects.id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

create policy "User can delete own projects"
on projects
for delete
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from project_members pm
    where pm.project_id = projects.id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

drop policy if exists "User can see tasks in his projects" on tasks;
drop policy if exists "User can create tasks" on tasks;
drop policy if exists "User can update tasks in member projects" on tasks;
drop policy if exists "User can delete tasks in member projects" on tasks;

create policy "User can see tasks in his projects"
on tasks
for select
to authenticated
using (
  project_id in (
    select project_id
    from project_members
    where user_id = auth.uid()
  )
  or project_id in (
    select id
    from projects
    where owner_id = auth.uid()
  )
);

create policy "User can create tasks"
on tasks
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    project_id in (
      select project_id
      from project_members
      where user_id = auth.uid()
    )
    or project_id in (
      select id
      from projects
      where owner_id = auth.uid()
    )
  )
);

create policy "User can update tasks in member projects"
on tasks
for update
to authenticated
using (
  created_by = auth.uid()
  or project_id in (
    select id
    from projects
    where owner_id = auth.uid()
  )
)
with check (
  created_by = auth.uid()
  or project_id in (
    select id
    from projects
    where owner_id = auth.uid()
  )
);

create policy "User can delete tasks in member projects"
on tasks
for delete
to authenticated
using (
  created_by = auth.uid()
  or project_id in (
    select id
    from projects
    where owner_id = auth.uid()
  )
);

drop policy if exists "User can see own memberships" on project_members;
drop policy if exists "User can see own or owned-project memberships" on project_members;
drop policy if exists "User or owner can see memberships" on project_members;
drop policy if exists "Owner can add members" on project_members;

create policy "User can see own or owned-project memberships"
on project_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_project_owner(project_id)
);

create policy "Owner can add members"
on project_members
for insert
to authenticated
with check (
  project_id in (
    select id
    from projects
    where owner_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar public read" on storage.objects;
drop policy if exists "Avatar upload own folder" on storage.objects;
drop policy if exists "Avatar update own folder" on storage.objects;
drop policy if exists "Avatar delete own folder" on storage.objects;

create policy "Avatar public read"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

create policy "Avatar upload own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Avatar update own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Avatar delete own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
