create or replace function public.get_user_profile_by_email(p_email text)
returns table (
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  joined_at timestamptz,
  about_me text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := auth.uid();
  v_normalized_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_normalized_email = '' then
    return;
  end if;

  return query
  select
    u.id::uuid as user_id,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(u.email::text, ''), '@', 1),
      'Unknown user'
    )::text as full_name,
    u.email::text as email,
    nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), '')::text as avatar_url,
    u.created_at::timestamptz as joined_at,
    nullif(trim(u.raw_user_meta_data ->> 'bio'), '')::text as about_me
  from auth.users u
  where lower(u.email::text) = v_normalized_email
  limit 1;
end;
$$;

revoke all on function public.get_user_profile_by_email(text) from public;
grant execute on function public.get_user_profile_by_email(text) to authenticated;
