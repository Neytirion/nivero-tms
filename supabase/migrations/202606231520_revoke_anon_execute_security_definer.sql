/**
 * Phase 22 follow-up: explicitly revoke anon EXECUTE on SECURITY DEFINER functions.
 *
 * Context:
 * - Previous hardening revoked public role access.
 * - If anon had explicit grants, they can persist.
 * - This migration makes revocation explicit and idempotent for current function set.
 */

REVOKE EXECUTE ON FUNCTION public.sync_after_task_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_after_time_entry_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalc_project_health(UUID) FROM anon;

REVOKE EXECUTE ON FUNCTION public.create_project_from_ai_draft(TEXT, TEXT, DATE, DATE, NUMERIC, NUMERIC, JSONB, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_project_document_object(TEXT, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_task_assignment_permissions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_project_owner_admin_membership() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_project_members_with_profile(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_project_role_for_user(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_project_permission(UUID, TEXT, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.invite_project_member_by_email(TEXT, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_project_owner(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalc_task_actual_hours(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_project_actual_hours(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_project_progress_from_tasks(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_task_actual_hours(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.remove_project_member(UUID, UUID, BOOLEAN) FROM anon;
REVOKE EXECUTE ON FUNCTION public.tasks_progress_rollup_trigger() FROM anon;
REVOKE EXECUTE ON FUNCTION public.time_entries_rollup_trigger() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_project_member_role(UUID, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_task_work_package_project() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_time_entry_task_project() FROM anon;
