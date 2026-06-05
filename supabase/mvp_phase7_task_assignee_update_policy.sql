-- Phase 7: Let assignees manage their assigned tasks
-- Run after phase2 hardening (or re-run safely anytime).

alter table public.tasks enable row level security;

drop policy if exists "User can update tasks in member projects" on public.tasks;

create policy "User can update tasks in member projects"
on public.tasks
for update
to authenticated
using (
  created_by = auth.uid()
  or assigned_to = auth.uid()
  or project_id in (
    select p.id
    from public.projects p
    where p.owner_id = auth.uid()
  )
  or project_id in (
    select pm.project_id
    from public.project_members pm
    where pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
)
with check (
  created_by = auth.uid()
  or assigned_to = auth.uid()
  or project_id in (
    select p.id
    from public.projects p
    where p.owner_id = auth.uid()
  )
  or project_id in (
    select pm.project_id
    from public.project_members pm
    where pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

notify pgrst, 'reload schema';
