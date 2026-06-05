-- Phase 10: Centralized project permissions matrix in DB + RPC hardening.
-- Run after previous phases.

alter table public.project_members drop constraint if exists project_members_role_check;
alter table public.project_members
  add constraint project_members_role_check
  check (lower(coalesce(role, '')) in ('member', 'admin', 'manager'));

create or replace function public.get_project_role_for_user(
  p_project_id uuid,
  p_user_id uuid default auth.uid()
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_member_role text;
begin
  if p_user_id is null then
    return null;
  end if;

  select p.owner_id
  into v_owner_id
  from public.projects p
  where p.id = p_project_id;

  if v_owner_id is null then
    return null;
  end if;

  if v_owner_id = p_user_id then
    return 'owner';
  end if;

  select lower(pm.role)
  into v_member_role
  from public.project_members pm
  where pm.project_id = p_project_id
    and pm.user_id = p_user_id
  limit 1;

  if v_member_role in ('admin', 'manager', 'member') then
    return v_member_role;
  end if;

  return null;
end;
$$;

revoke all on function public.get_project_role_for_user(uuid, uuid) from public;
grant execute on function public.get_project_role_for_user(uuid, uuid) to authenticated;

create or replace function public.has_project_permission(
  p_project_id uuid,
  p_permission text,
  p_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.get_project_role_for_user(p_project_id, p_user_id);
  v_permission text := lower(coalesce(p_permission, ''));
begin
  if v_role is null or v_permission = '' then
    return false;
  end if;

  if v_role = 'owner' then
    return true;
  end if;

  if v_role = 'admin' then
    return v_permission in (
      'project.manage',
      'project.delete',
      'project.invite',
      'project.complete',
      'member.role.update',
      'member.remove',
      'task.assign',
      'task.manage.any',
      'task.manage.own',
      'task.delete.any',
      'task.delete.own'
    );
  end if;

  if v_role = 'member' then
    return v_permission in (
      'project.invite',
      'task.manage.own',
      'task.delete.own'
    );
  end if;

  if v_role = 'manager' then
    return v_permission in (
      'project.manage',
      'project.invite',
      'project.complete',
      'task.assign',
      'task.manage.any',
      'task.manage.own',
      'task.delete.any',
      'task.delete.own'
    );
  end if;

  return false;
end;
$$;

revoke all on function public.has_project_permission(uuid, text, uuid) from public;
grant execute on function public.has_project_permission(uuid, text, uuid) to authenticated;

create or replace function public.invite_project_member_by_email(
  p_email text,
  p_project_id uuid,
  p_role text default 'member'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := auth.uid();
  v_target_user_id uuid;
  v_normalized_email text := lower(trim(p_email));
  v_role text := lower(coalesce(nullif(trim(p_role), ''), 'member'));
  v_is_owner boolean;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_project_permission(p_project_id, 'project.invite', v_actor_id) then
    raise exception 'Only project members can invite users';
  end if;

  if v_role not in ('member', 'manager', 'admin') then
    raise exception 'Invalid role';
  end if;

  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = v_actor_id
  ) into v_is_owner;

  -- Only users with manage permission can set elevated roles.
  if not public.has_project_permission(p_project_id, 'project.manage', v_actor_id) then
    v_role := 'member';
  end if;

  -- Admin role assignment remains owner-only.
  if v_role = 'admin' and not v_is_owner then
    v_role := 'member';
  end if;

  select u.id
  into v_target_user_id
  from auth.users u
  where lower(u.email) = v_normalized_email
  limit 1;

  if v_target_user_id is null then
    raise exception 'User with this email was not found';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (p_project_id, v_target_user_id, v_role)
  on conflict (project_id, user_id)
  do update set role = excluded.role;

  return v_target_user_id;
end;
$$;

revoke all on function public.invite_project_member_by_email(text, uuid, text) from public;
grant execute on function public.invite_project_member_by_email(text, uuid, text) to authenticated;

create or replace function public.update_project_member_role(
  p_project_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_role text := lower(coalesce(nullif(trim(p_role), ''), 'member'));
  v_is_owner boolean;
  v_target_is_owner boolean;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_role not in ('member', 'manager', 'admin') then
    raise exception 'Invalid role';
  end if;

  if not public.has_project_permission(p_project_id, 'member.role.update', v_actor_id) then
    raise exception 'Only project owner or admin can update member roles';
  end if;

  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = v_actor_id
  ) into v_is_owner;

  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = p_user_id
  ) into v_target_is_owner;

  if v_target_is_owner and not v_is_owner then
    raise exception 'Only project owner can change owner role';
  end if;

  if v_role = 'admin' and not v_is_owner then
    raise exception 'Only project owner can assign admin role';
  end if;

  update public.project_members pm
  set role = v_role
  where pm.project_id = p_project_id
    and pm.user_id = p_user_id;

  if not found then
    raise exception 'Member record not found';
  end if;
end;
$$;

revoke all on function public.update_project_member_role(uuid, uuid, text) from public;
grant execute on function public.update_project_member_role(uuid, uuid, text) to authenticated;

create or replace function public.remove_project_member(
  p_project_id uuid,
  p_user_id uuid,
  p_unassign_unfinished_tasks boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_target_is_owner boolean;
  v_unfinished_count int;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_project_permission(p_project_id, 'member.remove', v_actor_id) then
    raise exception 'Only project owner or admin can remove members';
  end if;

  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = p_user_id
  ) into v_target_is_owner;

  if v_target_is_owner then
    raise exception 'Project owner cannot be removed';
  end if;

  select count(*)
  into v_unfinished_count
  from public.tasks t
  where t.project_id = p_project_id
    and t.assigned_to = p_user_id
    and lower(coalesce(t.status, '')) not in ('done', 'completed');

  if v_unfinished_count > 0 and not p_unassign_unfinished_tasks then
    raise exception 'Member has % unfinished task(s). Confirm removal with task unassign.', v_unfinished_count;
  end if;

  if p_unassign_unfinished_tasks then
    update public.tasks t
    set assigned_to = null,
        updated_at = now()
    where t.project_id = p_project_id
      and t.assigned_to = p_user_id
      and lower(coalesce(t.status, '')) not in ('done', 'completed');
  end if;

  delete from public.project_members pm
  where pm.project_id = p_project_id
    and pm.user_id = p_user_id;

  if not found then
    raise exception 'Member record not found';
  end if;
end;
$$;

revoke all on function public.remove_project_member(uuid, uuid, boolean) from public;
grant execute on function public.remove_project_member(uuid, uuid, boolean) to authenticated;

create or replace function public.enforce_task_assignment_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if tg_op = 'INSERT' then
    if new.assigned_to is not null
      and new.assigned_to <> v_actor_id
      and not public.has_project_permission(new.project_id, 'task.assign', v_actor_id) then
      raise exception 'Permission denied: only owner, admin, or manager can assign tasks';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.assigned_to is distinct from old.assigned_to
      and new.assigned_to is not null
      and new.assigned_to <> v_actor_id
      and not public.has_project_permission(new.project_id, 'task.assign', v_actor_id) then
      raise exception 'Permission denied: only owner, admin, or manager can assign tasks';
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tasks_enforce_assignment_permissions on public.tasks;

create trigger trg_tasks_enforce_assignment_permissions
before insert or update on public.tasks
for each row
execute function public.enforce_task_assignment_permissions();

-- ------------------------------------------------------
-- RLS alignment with has_project_permission
-- ------------------------------------------------------

alter table public.projects enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "User can update own projects" on public.projects;
create policy "User can update own projects"
on public.projects
for update
to authenticated
using (public.has_project_permission(public.projects.id, 'project.manage'))
with check (public.has_project_permission(public.projects.id, 'project.manage'));

drop policy if exists "User can delete own projects" on public.projects;
create policy "User can delete own projects"
on public.projects
for delete
to authenticated
using (public.has_project_permission(public.projects.id, 'project.delete'));

drop policy if exists "User can create tasks" on public.tasks;
create policy "User can create tasks"
on public.tasks
for insert
to authenticated
with check (
  public.tasks.created_by = auth.uid()
  and (
    public.has_project_permission(public.tasks.project_id, 'task.manage.any')
    or public.has_project_permission(public.tasks.project_id, 'task.manage.own')
  )
);

drop policy if exists "User can update tasks in member projects" on public.tasks;
create policy "User can update tasks in member projects"
on public.tasks
for update
to authenticated
using (
  public.has_project_permission(public.tasks.project_id, 'task.manage.any')
  or (
    public.has_project_permission(public.tasks.project_id, 'task.manage.own')
    and (public.tasks.created_by = auth.uid() or public.tasks.assigned_to = auth.uid())
  )
)
with check (
  public.has_project_permission(public.tasks.project_id, 'task.manage.any')
  or (
    public.has_project_permission(public.tasks.project_id, 'task.manage.own')
    and (public.tasks.created_by = auth.uid() or public.tasks.assigned_to = auth.uid())
  )
);

drop policy if exists "User can delete tasks in member projects" on public.tasks;
create policy "User can delete tasks in member projects"
on public.tasks
for delete
to authenticated
using (
  public.has_project_permission(public.tasks.project_id, 'task.delete.any')
  or (
    public.has_project_permission(public.tasks.project_id, 'task.delete.own')
    and public.tasks.created_by = auth.uid()
  )
);

notify pgrst, 'reload schema';
