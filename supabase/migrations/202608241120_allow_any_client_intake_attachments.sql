-- Allow non-image attachments (pdf/docx/etc.) for client intake uploads.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-intake-images',
  'client-intake-images',
  true,
  5242880,
  null
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
