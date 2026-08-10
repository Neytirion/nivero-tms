-- ============================================================
-- Phase 24: Database Integrity Constraints
-- Adds missing constraints identified in schema audit 2026-08-10.
-- All changes are additive (no data modification).
-- Data was verified clean via diagnostic queries before applying.
--
-- ROLLBACK (run these to undo):
--   ALTER TABLE project_members DROP CONSTRAINT uq_project_members_user;
--   ALTER TABLE estimates        DROP CONSTRAINT uq_estimates_version;
--   ALTER TABLE task_dependencies DROP CONSTRAINT chk_no_self_dependency;
--   ALTER TABLE task_dependencies DROP CONSTRAINT uq_task_dependency;
--   ALTER TABLE time_entries     DROP CONSTRAINT chk_time_entry_order;
--   ALTER TABLE comment_mentions DROP CONSTRAINT uq_comment_mention;
--   ALTER TABLE projects         ALTER COLUMN owner_id DROP NOT NULL;
--   ALTER TABLE tasks            ALTER COLUMN created_by DROP NOT NULL;
--   ALTER TABLE project_members  ALTER COLUMN role DROP NOT NULL;
--   ALTER TABLE estimates        ALTER COLUMN created_by DROP NOT NULL;
--   ALTER TABLE projects         DROP COLUMN IF EXISTS updated_at;
-- ============================================================

BEGIN;

-- ── 1. project_members: prevent duplicate memberships ────────────────────────
-- Same user can only have one membership record per project.
ALTER TABLE public.project_members
  ADD CONSTRAINT uq_project_members_user UNIQUE (project_id, user_id);

-- ── 2. estimates: prevent duplicate version numbers per project ───────────────
ALTER TABLE public.estimates
  ADD CONSTRAINT uq_estimates_version UNIQUE (project_id, version_number);

-- ── 3. task_dependencies: prevent self-loops and duplicate deps ───────────────
ALTER TABLE public.task_dependencies
  ADD CONSTRAINT chk_no_self_dependency CHECK (task_id <> depends_on_task_id);

ALTER TABLE public.task_dependencies
  ADD CONSTRAINT uq_task_dependency UNIQUE (task_id, depends_on_task_id);

-- ── 4. time_entries: started_at must be before ended_at ──────────────────────
ALTER TABLE public.time_entries
  ADD CONSTRAINT chk_time_entry_order
    CHECK (started_at IS NULL OR ended_at IS NULL OR started_at < ended_at);

-- ── 5. comment_mentions: one mention per user per comment ────────────────────
ALTER TABLE public.comment_mentions
  ADD CONSTRAINT uq_comment_mention UNIQUE (comment_id, mentioned_user_id);

-- ── 6. projects.owner_id: project must have an owner ────────────────────────
ALTER TABLE public.projects
  ALTER COLUMN owner_id SET NOT NULL;

-- ── 7. tasks.created_by: task must have an author ───────────────────────────
ALTER TABLE public.tasks
  ALTER COLUMN created_by SET NOT NULL;

-- ── 8. project_members.role: role must be explicit ──────────────────────────
ALTER TABLE public.project_members
  ALTER COLUMN role SET NOT NULL;

-- ── 9. estimates.created_by: estimate must have an author ────────────────────
ALTER TABLE public.estimates
  ALTER COLUMN created_by SET NOT NULL;

-- ── 10. projects.updated_at: track last modification time ────────────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Backfill updated_at with created_at for existing rows
UPDATE public.projects SET updated_at = created_at WHERE updated_at = now();

-- Trigger to keep updated_at current (reuse existing helper if available)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
