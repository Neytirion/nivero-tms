drop function if exists public.get_project_members_with_profile(uuid) cascade;

create or replace function public.get_project_members_with_profile(p_project_id uuid)
returns table (
  member_id uuid,
  project_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  full_name text,
  email text,
  avatar_url text
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
    u.email::text as email,
    nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), '')::text as avatar_url
  from public.project_members pm
  left join auth.users u on u.id = pm.user_id
  where pm.project_id = p_project_id
  order by pm.created_at asc;
end;
$$;

revoke all on function public.get_project_members_with_profile(uuid) from public;
grant execute on function public.get_project_members_with_profile(uuid) to authenticated;
