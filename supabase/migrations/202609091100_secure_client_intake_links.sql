-- Add rate limiting and owner/admin-only rotation for public client intake links.

create table if not exists public.client_intake_rate_limits (
  token uuid not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  primary key (token, window_started_at),
  constraint client_intake_rate_limits_count_check check (request_count > 0)
);

alter table public.client_intake_rate_limits enable row level security;

revoke all on table public.client_intake_rate_limits from public, anon, authenticated;

create or replace function public.consume_client_intake_rate_limit(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_started_at timestamptz := to_timestamp(floor(extract(epoch from now()) / 300) * 300);
  v_request_count integer;
begin
  delete from public.client_intake_rate_limits
  where window_started_at < now() - interval '1 day';

  if not exists (
    select 1
    from public.projects
    where client_intake_token = p_token
  ) then
    return true;
  end if;

  insert into public.client_intake_rate_limits (token, window_started_at, request_count)
  values (p_token, v_window_started_at, 1)
  on conflict (token, window_started_at)
  do update set request_count = public.client_intake_rate_limits.request_count + 1
  returning request_count into v_request_count;

  return v_request_count <= 5;
end;
$$;

revoke all on function public.consume_client_intake_rate_limit(uuid) from public;
grant execute on function public.consume_client_intake_rate_limit(uuid) to anon, authenticated;

create or replace function public.rotate_client_intake_token(p_project_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_new_token uuid := gen_random_uuid();
  v_role text := public.get_project_role_for_user(p_project_id, v_actor_id);
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_role not in ('owner', 'admin') then
    raise exception 'Only project owner or admin can rotate the client intake link';
  end if;

  update public.projects
  set client_intake_token = v_new_token,
      updated_at = now()
  where id = p_project_id;

  if not found then
    raise exception 'Project not found';
  end if;

  return v_new_token;
end;
$$;

revoke all on function public.rotate_client_intake_token(uuid) from public, anon;
grant execute on function public.rotate_client_intake_token(uuid) to authenticated;

notify pgrst, 'reload schema';
