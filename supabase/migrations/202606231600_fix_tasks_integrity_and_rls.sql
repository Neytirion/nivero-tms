/**
 * Fix 1: tasks.project_id NOT NULL constraint
 *
 * A task without a project is an orphaned record — invisible to all users
 * (RLS filters by project membership) and excluded from CASCADE deletes.
 * Safe to remove any such rows before adding the constraint.
 *
 * Fix 2: tasks DELETE RLS — add manager role
 *
 * App-layer grants managers task.delete.any permission, but the RLS policy
 * only allowed admin. This caused the DB to reject manager delete attempts
 * even though the UI showed the delete button.
 */

-- ============================================================================
-- FIX 1: tasks.project_id NOT NULL
-- ============================================================================

-- Remove orphaned tasks (no project = invisible and uncascaded already)
DELETE FROM public.tasks WHERE project_id IS NULL;

-- Enforce NOT NULL at the database level
ALTER TABLE public.tasks ALTER COLUMN project_id SET NOT NULL;

-- ============================================================================
-- FIX 2: tasks DELETE RLS — allow manager to delete any task in their project
-- ============================================================================

DROP POLICY IF EXISTS "User can delete tasks in member projects" ON public.tasks;

CREATE POLICY "User can delete tasks in member projects"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  (created_by = auth.uid())
  OR (project_id IN (
    SELECT p.id
    FROM public.projects p
    WHERE p.owner_id = auth.uid()
  ))
  OR (project_id IN (
    SELECT pm.project_id
    FROM public.project_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'manager')
  ))
);
