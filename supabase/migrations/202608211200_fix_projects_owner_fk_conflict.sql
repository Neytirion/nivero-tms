-- Resolve FK/NULLability conflict on projects.owner_id.
-- Current state observed:
--   projects.owner_id is NOT NULL
--   FK action is ON DELETE SET NULL
-- This is inconsistent and can fail on user delete.
--
-- Chosen behavior:
--   Keep owner_id NOT NULL and enforce ON DELETE RESTRICT.
--   Project ownership must be transferred before deleting a user.

BEGIN;

-- Drop known historical FK names if they exist.
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_owner_id_fkey_auth_users;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS fk_projects_owner_id;

-- Recreate FK with RESTRICT semantics.
ALTER TABLE public.projects
  ADD CONSTRAINT fk_projects_owner_id
  FOREIGN KEY (owner_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- Ensure the column remains required.
ALTER TABLE public.projects
  ALTER COLUMN owner_id SET NOT NULL;

COMMIT;
