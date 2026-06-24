-- Enforce owner-only project deletion at DB level.
-- This aligns RLS with frontend permission matrix where admin/manager cannot delete projects.

drop policy if exists "User can delete own projects" on public.projects;

create policy "User can delete own projects"
on public.projects
for delete
to authenticated
using (public.projects.owner_id = auth.uid());

notify pgrst, 'reload schema';
