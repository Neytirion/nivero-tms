-- Allow project members to claim unassigned tasks that were created by another user
-- (for example tasks created via public client intake).
--
-- The trigger enforce_task_assignment_permissions still guarantees that for
-- unassigned tasks the only allowed update is setting assigned_to = auth.uid().

DROP POLICY IF EXISTS "User can update tasks in member projects" ON public.tasks;

CREATE POLICY "User can update tasks in member projects"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  (
    project_id IN (
      SELECT pm.project_id
      FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
    OR project_id IN (
      SELECT p.id
      FROM public.projects p
      WHERE p.owner_id = auth.uid()
    )
  )
  AND (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR assigned_to IS NULL
    OR project_id IN (
      SELECT p.id
      FROM public.projects p
      WHERE p.owner_id = auth.uid()
    )
  )
)
WITH CHECK (
  (
    project_id IN (
      SELECT pm.project_id
      FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
    OR project_id IN (
      SELECT p.id
      FROM public.projects p
      WHERE p.owner_id = auth.uid()
    )
  )
  AND (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR project_id IN (
      SELECT p.id
      FROM public.projects p
      WHERE p.owner_id = auth.uid()
    )
  )
);
