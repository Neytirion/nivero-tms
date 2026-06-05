-- Run in Supabase SQL Editor.
-- This RPC lets project members invite users by email.

create unique index if not exists project_members_project_user_uidx
  on public.project_members (project_id, user_id);

drop function if exists public.invite_project_member_by_email(uuid, text, text);
drop function if exists public.invite_project_member_by_email(text, uuid, text);
drop function if exists public.invite_project_member_by_email(text, uuid);
drop function if exists public.update_project_member_role(uuid, uuid, text);

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
  v_role text := coalesce(nullif(trim(p_role), ''), 'member');
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = v_actor_id
  ) and not exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = v_actor_id
  ) then
    raise exception 'Only project members can invite users';
  end if;

  -- Non-owners can only invite with member role.
  if not exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = v_actor_id
  ) then
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
  v_role text := coalesce(nullif(trim(p_role), ''), 'member');
  v_is_owner boolean;
  v_is_admin boolean;
  v_target_is_owner boolean;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_role not in ('member', 'admin') then
    raise exception 'Invalid role';
  end if;

  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = v_actor_id
  ) into v_is_owner;

  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = v_actor_id
      and pm.role = 'admin'
  ) into v_is_admin;

  if not v_is_owner and not v_is_admin then
    raise exception 'Only project owner or admin can update member roles';
  end if;

  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = p_user_id
  ) into v_target_is_owner;

  if v_target_is_owner and not v_is_owner then
    raise exception 'Only project owner can change owner role';
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

notify pgrst, 'reload schema';
