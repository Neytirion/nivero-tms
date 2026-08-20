-- Add project-scoped display roles and member display-role assignments.
-- These are visual labels only and do not affect permission checks.

create table if not exists public.project_display_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_display_roles_name_not_empty check (length(trim(name)) > 0)
);

create unique index if not exists project_display_roles_project_name_uidx
  on public.project_display_roles (project_id, lower(name));

create table if not exists public.project_member_display_roles (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_member_display_roles_display_role_not_empty check (length(trim(display_role)) > 0),
  primary key (project_id, user_id)
);

create index if not exists project_member_display_roles_project_idx
  on public.project_member_display_roles (project_id);

alter table public.project_display_roles enable row level security;
alter table public.project_member_display_roles enable row level security;

-- Shared access helper expressions are inlined to keep migration self-contained.
drop policy if exists "Display roles visible to members" on public.project_display_roles;
create policy "Display roles visible to members"
on public.project_display_roles
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_display_roles.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_display_roles.project_id
      and pm.user_id = auth.uid()
  )
);

drop policy if exists "Display roles manageable by managers" on public.project_display_roles;
create policy "Display roles manageable by managers"
on public.project_display_roles
for all
to authenticated
using (public.has_project_permission(project_display_roles.project_id, 'project.manage', auth.uid()))
with check (public.has_project_permission(project_display_roles.project_id, 'project.manage', auth.uid()));

drop policy if exists "Member display roles visible to members" on public.project_member_display_roles;
create policy "Member display roles visible to members"
on public.project_member_display_roles
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_member_display_roles.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_member_display_roles.project_id
      and pm.user_id = auth.uid()
  )
);

drop policy if exists "Member display roles manageable by managers" on public.project_member_display_roles;
create policy "Member display roles manageable by managers"
on public.project_member_display_roles
for all
to authenticated
using (public.has_project_permission(project_member_display_roles.project_id, 'project.manage', auth.uid()))
with check (public.has_project_permission(project_member_display_roles.project_id, 'project.manage', auth.uid()));

-- Keep updated_at fresh on updates.
drop trigger if exists project_display_roles_set_updated_at on public.project_display_roles;
create trigger project_display_roles_set_updated_at
before update on public.project_display_roles
for each row
execute function public.set_row_updated_at();

drop trigger if exists project_member_display_roles_set_updated_at on public.project_member_display_roles;
create trigger project_member_display_roles_set_updated_at
before update on public.project_member_display_roles
for each row
execute function public.set_row_updated_at();

notify pgrst, 'reload schema';
