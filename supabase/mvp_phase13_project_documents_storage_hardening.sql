-- Phase 13: Harden project-documents storage policies.
-- Restrict all access to project members and project owner only.

update storage.buckets
set public = false
where id = 'project-documents';

create or replace function public.project_id_from_document_object_name(p_object_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  v_prefix text;
begin
  v_prefix := (storage.foldername(p_object_name))[1];

  if v_prefix is null then
    return null;
  end if;

  if v_prefix ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return v_prefix::uuid;
  end if;

  return null;
end;
$$;

create or replace function public.can_access_project_document_object(
  p_object_name text,
  p_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_project_id uuid := public.project_id_from_document_object_name(p_object_name);
begin
  if p_user_id is null or v_project_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.projects p
    where p.id = v_project_id
      and (
        p.owner_id = p_user_id
        or exists (
          select 1
          from public.project_members pm
          where pm.project_id = v_project_id
            and pm.user_id = p_user_id
        )
      )
  );
end;
$$;

revoke all on function public.can_access_project_document_object(text, uuid) from public;
grant execute on function public.can_access_project_document_object(text, uuid) to authenticated;

drop policy if exists "Project docs public read" on storage.objects;
drop policy if exists "Project docs upload by authenticated" on storage.objects;
drop policy if exists "Project docs update by authenticated" on storage.objects;
drop policy if exists "Project docs delete by authenticated" on storage.objects;

create policy "Project docs read by project members"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-documents'
  and public.can_access_project_document_object(name)
);

create policy "Project docs upload by project members"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-documents'
  and public.can_access_project_document_object(name)
);

create policy "Project docs update by project members"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'project-documents'
  and public.can_access_project_document_object(name)
)
with check (
  bucket_id = 'project-documents'
  and public.can_access_project_document_object(name)
);

create policy "Project docs delete by project members"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-documents'
  and public.can_access_project_document_object(name)
);

notify pgrst, 'reload schema';
