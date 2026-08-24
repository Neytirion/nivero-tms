-- Project-level task card field visibility preferences.

create table if not exists public.project_task_card_preferences (
  project_id uuid primary key references public.projects(id) on delete cascade,
  show_description boolean not null default true,
  show_priority boolean not null default true,
  show_due_state boolean not null default true,
  show_due_date boolean not null default true,
  show_assignee boolean not null default true,
  show_work_package boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_task_card_preferences_updated_by_idx
  on public.project_task_card_preferences (updated_by);

alter table public.project_task_card_preferences enable row level security;

drop policy if exists "Task card preferences visible to members" on public.project_task_card_preferences;
create policy "Task card preferences visible to members"
on public.project_task_card_preferences
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_task_card_preferences.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_task_card_preferences.project_id
      and pm.user_id = auth.uid()
  )
);

drop policy if exists "Task card preferences manageable by task assigners" on public.project_task_card_preferences;
drop policy if exists "Task card preferences manageable by admins" on public.project_task_card_preferences;
drop policy if exists "Task card preferences manageable by owners and admins" on public.project_task_card_preferences;
create policy "Task card preferences manageable by owners and admins"
on public.project_task_card_preferences
for all
to authenticated
using (public.get_project_role_for_user(project_task_card_preferences.project_id, auth.uid()) in ('owner', 'admin'))
with check (public.get_project_role_for_user(project_task_card_preferences.project_id, auth.uid()) in ('owner', 'admin'));

drop trigger if exists project_task_card_preferences_set_updated_at on public.project_task_card_preferences;
create trigger project_task_card_preferences_set_updated_at
before update on public.project_task_card_preferences
for each row
execute function public.set_row_updated_at();

notify pgrst, 'reload schema';
