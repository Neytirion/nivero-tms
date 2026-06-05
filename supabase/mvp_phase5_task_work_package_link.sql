-- Phase 5: Link tasks to estimate work packages
-- Run after phase1/phase2/phase3/phase4 scripts.

alter table public.tasks
  add column if not exists work_package_id uuid references public.work_packages(id) on delete set null;

create index if not exists tasks_work_package_idx
  on public.tasks (work_package_id);

create or replace function public.validate_task_work_package_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_work_package_project_id uuid;
begin
  if new.work_package_id is null then
    return new;
  end if;

  if new.project_id is null then
    raise exception 'Task project is required when work package is set';
  end if;

  select e.project_id
  into v_work_package_project_id
  from public.work_packages wp
  join public.estimates e on e.id = wp.estimate_id
  where wp.id = new.work_package_id;

  if v_work_package_project_id is null then
    raise exception 'Invalid work_package_id: package not found';
  end if;

  if v_work_package_project_id <> new.project_id then
    raise exception 'Task and work package belong to different projects';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_task_work_package_project on public.tasks;
create trigger trg_validate_task_work_package_project
before insert or update on public.tasks
for each row
execute function public.validate_task_work_package_project();

notify pgrst, 'reload schema';
