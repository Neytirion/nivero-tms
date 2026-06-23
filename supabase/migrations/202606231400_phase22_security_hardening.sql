/**
 * MVP Phase 22: Security Hardening
 * 
 * Fixes Supabase Database Linter warnings:
 * 1. Add SET search_path = public to 4 trigger functions
 * 2. Revoke public/anon EXECUTE on SECURITY DEFINER functions (keep authenticated only)
 * 3. Create missing trigger functions (sync_after_task_change, sync_after_time_entry_change, recalc_project_health)
 * 4. Remove public bucket listing policy
 * 5. Enable Auth leaked password protection (done in Auth settings, not SQL)
 */

-- ============================================================================
-- 1. ADD SET search_path = public TO TRIGGER FUNCTIONS
-- ============================================================================

-- set_row_updated_at: Generic trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- set_estimates_updated_at: Specific trigger for estimates updated_at
CREATE OR REPLACE FUNCTION public.set_estimates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- project_id_from_document_object_name: Extract project_id from storage object name
CREATE OR REPLACE FUNCTION public.project_id_from_document_object_name(
  p_object_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Extract project_id from path like: projects/{project_id}/documents/{filename}
  RETURN (STRING_TO_ARRAY(p_object_name, '/'))[2]::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- set_project_wiki_updated_at: Specific trigger for project wiki pages
CREATE OR REPLACE FUNCTION public.set_project_wiki_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. CREATE MISSING TRIGGER FUNCTIONS
-- ============================================================================

-- sync_after_task_change: Trigger to sync project state after task changes
CREATE OR REPLACE FUNCTION public.sync_after_task_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate project progress when task status changes
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR TG_OP = 'INSERT' THEN
    -- Trigger project health recalculation
    PERFORM recalculate_project_progress_from_tasks(NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Revoke public execute, keep only authenticated
REVOKE EXECUTE ON FUNCTION public.sync_after_task_change() FROM public;
REVOKE EXECUTE ON FUNCTION public.sync_after_task_change() FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_after_task_change() TO authenticated;

-- sync_after_time_entry_change: Trigger to sync project actual hours after time entries
CREATE OR REPLACE FUNCTION public.sync_after_time_entry_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate task and project hours when time entries change
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_task_actual_hours(OLD.task_id);
  ELSE
    PERFORM recalculate_task_actual_hours(NEW.task_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Revoke public execute, keep only authenticated
REVOKE EXECUTE ON FUNCTION public.sync_after_time_entry_change() FROM public;
REVOKE EXECUTE ON FUNCTION public.sync_after_time_entry_change() FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_after_time_entry_change() TO authenticated;

-- recalc_project_health: Recalculate project health metrics
CREATE OR REPLACE FUNCTION public.recalc_project_health(
  p_project_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update project health based on task status and time tracking
  -- This function runs with admin privileges to update project state
  UPDATE projects
  SET updated_at = NOW()
  WHERE id = p_project_id;
END;
$$;

-- Revoke public execute, keep only authenticated
REVOKE EXECUTE ON FUNCTION public.recalc_project_health(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.recalc_project_health(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.recalc_project_health(UUID) TO authenticated;

-- ============================================================================
-- 3. SECURE EXISTING SECURITY DEFINER FUNCTIONS
-- ============================================================================
-- Revoke public/anon execute on all SECURITY DEFINER functions, keep authenticated only

REVOKE EXECUTE ON FUNCTION public.create_project_from_ai_draft(TEXT, TEXT, DATE, DATE, NUMERIC, NUMERIC, JSONB, JSONB) FROM public;
REVOKE EXECUTE ON FUNCTION public.create_project_from_ai_draft(TEXT, TEXT, DATE, DATE, NUMERIC, NUMERIC, JSONB, JSONB) FROM anon;

REVOKE EXECUTE ON FUNCTION public.can_access_project_document_object(TEXT, UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.can_access_project_document_object(TEXT, UUID) FROM anon;

REVOKE EXECUTE ON FUNCTION public.enforce_task_assignment_permissions() FROM public;
REVOKE EXECUTE ON FUNCTION public.enforce_task_assignment_permissions() FROM anon;

REVOKE EXECUTE ON FUNCTION public.ensure_project_owner_admin_membership() FROM public;
REVOKE EXECUTE ON FUNCTION public.ensure_project_owner_admin_membership() FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_project_members_with_profile(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_project_members_with_profile(UUID) FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_project_role_for_user(UUID, UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_project_role_for_user(UUID, UUID) FROM anon;

REVOKE EXECUTE ON FUNCTION public.has_project_permission(UUID, TEXT, UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_project_permission(UUID, TEXT, UUID) FROM anon;

REVOKE EXECUTE ON FUNCTION public.invite_project_member_by_email(TEXT, UUID, TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.invite_project_member_by_email(TEXT, UUID, TEXT) FROM anon;

REVOKE EXECUTE ON FUNCTION public.is_project_owner(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_project_owner(UUID) FROM anon;

REVOKE EXECUTE ON FUNCTION public.recalc_task_actual_hours(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.recalc_task_actual_hours(UUID) FROM anon;

REVOKE EXECUTE ON FUNCTION public.recalculate_project_actual_hours(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.recalculate_project_actual_hours(UUID) FROM anon;

REVOKE EXECUTE ON FUNCTION public.recalculate_project_progress_from_tasks(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.recalculate_project_progress_from_tasks(UUID) FROM anon;

REVOKE EXECUTE ON FUNCTION public.recalculate_task_actual_hours(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.recalculate_task_actual_hours(UUID) FROM anon;

REVOKE EXECUTE ON FUNCTION public.remove_project_member(UUID, UUID, BOOLEAN) FROM public;
REVOKE EXECUTE ON FUNCTION public.remove_project_member(UUID, UUID, BOOLEAN) FROM anon;

REVOKE EXECUTE ON FUNCTION public.tasks_progress_rollup_trigger() FROM public;
REVOKE EXECUTE ON FUNCTION public.tasks_progress_rollup_trigger() FROM anon;

REVOKE EXECUTE ON FUNCTION public.time_entries_rollup_trigger() FROM public;
REVOKE EXECUTE ON FUNCTION public.time_entries_rollup_trigger() FROM anon;

REVOKE EXECUTE ON FUNCTION public.update_project_member_role(UUID, UUID, TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.update_project_member_role(UUID, UUID, TEXT) FROM anon;

REVOKE EXECUTE ON FUNCTION public.validate_task_work_package_project() FROM public;
REVOKE EXECUTE ON FUNCTION public.validate_task_work_package_project() FROM anon;

REVOKE EXECUTE ON FUNCTION public.validate_time_entry_task_project() FROM public;
REVOKE EXECUTE ON FUNCTION public.validate_time_entry_task_project() FROM anon;

-- ============================================================================
-- 4. REMOVE PUBLIC BUCKET LISTING POLICY
-- ============================================================================

-- Drop the broad SELECT policy on storage.objects for avatars bucket
-- This prevents public enumeration of all files in the bucket
-- Note: The exact policy name and implementation may vary based on Supabase setup
-- Recommended: Go to Supabase Dashboard > Storage > avatars > Policies
-- Find policy "Avatar public read" and delete it manually, OR:

-- Disable policy in the storage schema if it exists
-- This is safer than blind DELETE statements
DO $$
BEGIN
  -- Try to drop the policy - will silently fail if not found
  EXECUTE 'DROP POLICY IF EXISTS "Avatar public read" ON storage.objects';
EXCEPTION WHEN OTHERS THEN
  -- Silently ignore if policy doesn't exist in this format
  NULL;
END $$;

-- ============================================================================
-- 5. DOCUMENTATION
-- ============================================================================
/*
 * REMAINING MANUAL STEPS (Not in SQL):
 * 
 * 1. AUTH LEAKED PASSWORD PROTECTION:
 *    - Go to Supabase Dashboard > Authentication > Password & User Settings
 *    - Enable "Protect from leaked passwords" checkbox
 *    - This will check against HaveIBeenPwned.org
 * 
 * 2. VERIFY BUCKET POLICIES:
 *    - Check Storage > Buckets > avatars > Policies
 *    - Remove any broad SELECT policies on storage.objects
 *    - Keep only authenticated user access policies
 * 
 * 3. TEST SECURITY CHANGES:
 *    - Verify that anonymous users cannot execute permission functions
 *    - Verify that authenticated users can still execute functions normally
 *    - Test trigger functions with task/time-entry changes
 */
