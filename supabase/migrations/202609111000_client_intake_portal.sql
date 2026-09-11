-- Add project-scoped client portal access and a durable task-to-request registry.

alter table public.projects
  add column if not exists client_intake_enabled boolean not null default true,
  add column if not exists client_intake_expires_at timestamptz not null default (now() + interval '30 days');

update public.projects
set client_intake_expires_at = coalesce(client_intake_expires_at, now() + interval '30 days');

create table if not exists public.client_intake_requests (
  task_id uuid primary key references public.tasks(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists client_intake_requests_project_created_idx
  on public.client_intake_requests (project_id, created_at desc);

alter table public.client_intake_requests enable row level security;
revoke all on table public.client_intake_requests from public, anon, authenticated;

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
      client_intake_enabled = true,
      client_intake_expires_at = now() + interval '30 days',
      updated_at = now()
  where id = p_project_id;

  if not found then
    raise exception 'Project not found';
  end if;

  return v_new_token;
end;
$$;

create or replace function public.set_client_intake_enabled(p_project_id uuid, p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_role text := public.get_project_role_for_user(p_project_id, v_actor_id);
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_role not in ('owner', 'admin') then
    raise exception 'Only project owner or admin can change the client intake link';
  end if;

  update public.projects
  set client_intake_enabled = p_enabled,
      updated_at = now()
  where id = p_project_id;

  if not found then
    raise exception 'Project not found';
  end if;

  return p_enabled;
end;
$$;

revoke all on function public.set_client_intake_enabled(uuid, boolean) from public, anon;
grant execute on function public.set_client_intake_enabled(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';