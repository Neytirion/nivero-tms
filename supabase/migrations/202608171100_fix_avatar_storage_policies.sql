-- Ensure avatar storage bucket and RLS policies allow authenticated users
-- to upload files inside their own folder: <auth.uid()>/...

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar public read" on storage.objects;
drop policy if exists "Avatar upload own folder" on storage.objects;
drop policy if exists "Avatar update own folder" on storage.objects;
drop policy if exists "Avatar delete own folder" on storage.objects;

create policy "Avatar public read"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

create policy "Avatar upload own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and name like auth.uid()::text || '/%'
);

create policy "Avatar update own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and name like auth.uid()::text || '/%'
)
with check (
  bucket_id = 'avatars'
  and name like auth.uid()::text || '/%'
);

create policy "Avatar delete own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and name like auth.uid()::text || '/%'
);
