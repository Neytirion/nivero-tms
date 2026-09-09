-- Restrict public client intake uploads to non-executable document and image types.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-intake-images',
  'client-intake-images',
  true,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
    'text/plain'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
