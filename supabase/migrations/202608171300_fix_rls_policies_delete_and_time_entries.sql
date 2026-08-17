-- Fix delete policy: only owner can delete projects, not admin
drop policy if exists "User can delete own projects" on projects;

create policy "User can delete own projects"
on projects
for delete
to authenticated
using (
  owner_id = auth.uid()
);

-- Add missing RLS policies for time_entries
drop policy if exists "User can see time entries in their projects" on time_entries;
drop policy if exists "User can create own time entries" on time_entries;
drop policy if exists "User can update own time entries" on time_entries;
drop policy if exists "User can delete own time entries" on time_entries;

create policy "User can see time entries in their projects"
on time_entries
for select
to authenticated
using (
  project_id in (
    select project_id
    from project_members
    where user_id = auth.uid()
  )
  or project_id in (
    select id
    from projects
    where owner_id = auth.uid()
  )
);

create policy "User can create own time entries"
on time_entries
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    project_id in (
      select project_id
      from project_members
      where user_id = auth.uid()
    )
    or project_id in (
      select id
      from projects
      where owner_id = auth.uid()
    )
  )
);

create policy "User can update own time entries"
on time_entries
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

create policy "User can delete own time entries"
on time_entries
for delete
to authenticated
using (
  user_id = auth.uid()
);
