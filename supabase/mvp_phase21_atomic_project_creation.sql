-- Phase 21: Atomic project creation from AI draft
-- Ensures project + estimate + work packages + tasks are created as a single transaction
-- or rolled back entirely on any error.

create or replace function public.create_project_from_ai_draft(
  p_project_name text,
  p_project_customer_name text default null,
  p_project_start_date date default null,
  p_project_end_date date default null,
  p_project_estimated_hours numeric default null,
  p_project_budget_amount numeric default null,
  p_work_packages jsonb,
  p_tasks jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_project_id uuid;
  v_estimate_id uuid;
  v_work_package record;
  v_work_package_id uuid;
  v_task_json jsonb;
  v_created_task_count integer := 0;
  v_work_package_by_name_idx jsonb := '{}'::jsonb;
  i integer;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_project_name is null or p_project_name = '' then
    raise exception 'Project name is required';
  end if;

  -- 1. Create project
  insert into public.projects (
    name,
    customer_name,
    owner_id,
    project_manager_id,
    start_date,
    end_date,
    estimated_hours,
    budget_amount,
    deadline_at,
    status
  ) values (
    p_project_name,
    p_project_customer_name,
    v_actor_id,
    v_actor_id,
    p_project_start_date,
    p_project_end_date,
    p_project_estimated_hours,
    p_project_budget_amount,
    p_project_end_date,
    'active'
  ) returning id into v_project_id;

  if v_project_id is null then
    raise exception 'Failed to create project';
  end if;

  -- 2. Create estimate version (always v1)
  insert into public.estimates (
    project_id,
    version_number,
    status,
    created_by
  ) values (
    v_project_id,
    1,
    'draft',
    v_actor_id
  ) returning id into v_estimate_id;

  if v_estimate_id is null then
    raise exception 'Failed to create estimate';
  end if;

  -- 3. Create work packages and build name->id index
  for i in 0 .. jsonb_array_length(p_work_packages) - 1 loop
    v_work_package := jsonb_array_element(p_work_packages, i);

    insert into public.work_packages (
      estimate_id,
      name,
      estimated_hours,
      sort_order,
      is_active
    ) values (
      v_estimate_id,
      (v_work_package -> 'name')::text,
      ((v_work_package -> 'estimated_hours')::text)::numeric,
      i,
      true
    ) returning id into v_work_package_id;

    if v_work_package_id is not null then
      v_work_package_by_name_idx := v_work_package_by_name_idx || jsonb_build_object(
        (v_work_package -> 'name')::text,
        v_work_package_id::text
      );
    end if;
  end loop;

  -- 4. Create tasks linked to work packages
  for i in 0 .. jsonb_array_length(p_tasks) - 1 loop
    v_task_json := jsonb_array_element(p_tasks, i);

    v_work_package_id := (
      v_work_package_by_name_idx -> ((v_task_json -> 'work_package_name')::text)
    )::uuid;

    if v_work_package_id is not null then
      insert into public.tasks (
        project_id,
        work_package_id,
        title,
        description,
        status,
        priority,
        estimate_hours,
        created_by
      ) values (
        v_project_id,
        v_work_package_id,
        (v_task_json -> 'title')::text,
        (v_task_json ->> 'description'),
        coalesce((v_task_json ->> 'status'), 'todo'),
        coalesce((v_task_json ->> 'priority'), 'medium'),
        ((v_task_json -> 'estimate_hours')::text)::numeric,
        v_actor_id
      );

      v_created_task_count := v_created_task_count + 1;
    end if;
  end loop;

  -- 5. Return success with metadata
  return jsonb_build_object(
    'success', true,
    'project_id', v_project_id,
    'estimate_id', v_estimate_id,
    'task_count', v_created_task_count,
    'work_package_count', jsonb_array_length(p_work_packages)
  );

exception when others then
  -- Any error triggers automatic transaction rollback
  raise exception 'Failed to create project from AI draft: %', sqlerrm;
end;
$$;

revoke all on function public.create_project_from_ai_draft(text, text, date, date, numeric, numeric, jsonb, jsonb) from public;
grant execute on function public.create_project_from_ai_draft(text, text, date, date, numeric, numeric, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
