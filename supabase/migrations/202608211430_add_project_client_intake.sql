-- Add per-project public intake token and storage for client-uploaded images.

alter table public.projects
  add column if not exists client_intake_token uuid not null default gen_random_uuid();

create unique index if not exists projects_client_intake_token_uidx
  on public.projects (client_intake_token);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-intake-images',
  'client-intake-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
