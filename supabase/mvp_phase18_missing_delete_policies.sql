-- Phase 18: Add missing DELETE and UPDATE RLS policies.
-- Gaps identified by diagnostic query vs actual DB state.
-- Run after all previous phases.

-- =============================================
-- 1) COMMENTS — UPDATE (author only) and DELETE (author or owner/admin)
-- =============================================

-- Author can edit the message of their own comment.
drop policy if exists "Comments update by author" on public.comments;
create policy "Comments update by author"
on public.comments
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Author can always delete their own comment.
-- Project owner and admins can also delete any comment in the project.
drop policy if exists "Comments delete by author or admin" on public.comments;
create policy "Comments delete by author or admin"
on public.comments
for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.projects p
    where p.id = comments.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = comments.project_id
      and pm.user_id = auth.uid()
      and lower(coalesce(pm.role, '')) in ('admin', 'manager')
  )
);

-- =============================================
-- 2) PROJECT_DOCUMENTS — DELETE (uploader or owner/admin)
-- =============================================
-- No UPDATE policy: documents are immutable after upload (re-upload = delete + insert).

-- Uploader can delete their own document.
-- Project owner and admins can also remove any document from the project.
drop policy if exists "Project documents delete by author or admin" on public.project_documents;
create policy "Project documents delete by author or admin"
on public.project_documents
for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.projects p
    where p.id = project_documents.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_documents.project_id
      and pm.user_id = auth.uid()
      and lower(coalesce(pm.role, '')) in ('admin', 'manager')
  )
);

-- =============================================
-- 3) PROJECT_WIKI_PAGES — DELETE (owner/admin only)
-- =============================================
-- There is exactly one wiki page per project (unique on project_id).
-- Deletion is destructive so only owner and admin/manager are allowed.

drop policy if exists "Project wiki delete by managers" on public.project_wiki_pages;
create policy "Project wiki delete by managers"
on public.project_wiki_pages
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_wiki_pages.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_wiki_pages.project_id
      and pm.user_id = auth.uid()
      and lower(coalesce(pm.role, '')) in ('admin', 'manager')
  )
);

-- =============================================
-- DONE
-- =============================================

notify pgrst, 'reload schema';
