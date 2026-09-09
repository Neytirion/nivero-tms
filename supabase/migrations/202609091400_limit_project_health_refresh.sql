-- Avoid recalculating every project on every project-list request.
-- Health is recalculated by mutation triggers and at most once per day for
-- schedule-based metrics that change as the calendar advances.

alter table public.projects
  add column if not exists health_calculated_at timestamptz;

create or replace function public.refresh_my_project_health()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_project_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  for v_project_id in
    select p.id
    from public.projects p
    where (
      p.owner_id = v_actor_id
      or exists (
        select 1
        from public.project_members pm
        where pm.project_id = p.id
          and pm.user_id = v_actor_id
      )
    )
    and (
      p.health_calculated_at is null
      or p.health_calculated_at < date_trunc('day', now())
    )
  loop
    perform public.recalc_project_health(v_project_id);

    update public.projects
    set health_calculated_at = now()
    where id = v_project_id;
  end loop;
end;
$$;

revoke all on function public.refresh_my_project_health() from public;
grant execute on function public.refresh_my_project_health() to authenticated;

notify pgrst, 'reload schema';
