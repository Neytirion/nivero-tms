-- Tighten display-role assignment permissions.
-- Members can manage only their own display role assignment.
-- Elevated project role managers (owner/admin) can manage any member assignment.

drop policy if exists "Member display roles manageable by managers" on public.project_member_display_roles;

create policy "Member display roles self or admin manage"
on public.project_member_display_roles
for all
to authenticated
using (
  (
    user_id = auth.uid()
    and (
      exists (
        select 1
        from public.projects p
        where p.id = project_member_display_roles.project_id
          and p.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.project_members pm
        where pm.project_id = project_member_display_roles.project_id
          and pm.user_id = auth.uid()
      )
    )
  )
  or public.has_project_permission(project_member_display_roles.project_id, 'member.role.update', auth.uid())
)
with check (
  (
    user_id = auth.uid()
    and (
      exists (
        select 1
        from public.projects p
        where p.id = project_member_display_roles.project_id
          and p.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.project_members pm
        where pm.project_id = project_member_display_roles.project_id
          and pm.user_id = auth.uid()
      )
    )
  )
  or public.has_project_permission(project_member_display_roles.project_id, 'member.role.update', auth.uid())
);

notify pgrst, 'reload schema';
