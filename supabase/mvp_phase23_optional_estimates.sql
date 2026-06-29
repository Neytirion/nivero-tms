/**
 * MVP Phase 23: Make Estimates Optional
 * 
 * Allows projects to operate without mandatory estimate versioning.
 * Projects can now choose whether to use the estimate module or not.
 * 
 * Changes:
 * 1. Add `use_estimates` column to projects table (default false)
 * 2. Update task creation logic to only require estimate version if use_estimates = true
 * 3. Allow simple estimate numbers on tasks independent of estimate versions
 */

-- ============================================================================
-- 1. ADD use_estimates COLUMN TO PROJECTS
-- ============================================================================

ALTER TABLE public.projects
ADD COLUMN use_estimates BOOLEAN NOT NULL DEFAULT false;

-- Add helpful comment
COMMENT ON COLUMN public.projects.use_estimates IS 
'When true, project requires estimate versioning for task creation. 
When false, tasks can be created with simple estimates or no estimates.';

-- ============================================================================
-- 2. UPDATE RLS POLICIES
-- ============================================================================

-- No changes needed to existing policies - use_estimates is just a project setting
-- Existing policies already protect project data appropriately
