-- MVP Phase 8: Database Integrity Improvements
-- Adds Foreign Key constraints on users and fixes nullable constraints

-- 1. Add FK constraints on comments.user_id
ALTER TABLE comments
ADD CONSTRAINT fk_comments_user_id FOREIGN KEY (user_id)
REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add FK constraint on estimates.created_by
ALTER TABLE estimates
ADD CONSTRAINT fk_estimates_created_by FOREIGN KEY (created_by)
REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Add FK constraints on project_documents.user_id
ALTER TABLE project_documents
ADD CONSTRAINT fk_project_documents_user_id FOREIGN KEY (user_id)
REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Make project_members.project_id NOT NULL (it should always be set)
ALTER TABLE project_members
ALTER COLUMN project_id SET NOT NULL;

-- 5. Make project_members.user_id NOT NULL (member must be linked to user)
ALTER TABLE project_members
ALTER COLUMN user_id SET NOT NULL;

-- 6. Add FK constraint on project_members.user_id
ALTER TABLE project_members
ADD CONSTRAINT fk_project_members_user_id FOREIGN KEY (user_id)
REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. Add FK constraints on projects.owner_id
ALTER TABLE projects
ADD CONSTRAINT fk_projects_owner_id FOREIGN KEY (owner_id)
REFERENCES auth.users(id) ON DELETE SET NULL;

-- 8. Add FK constraint on projects.project_manager_id
ALTER TABLE projects
ADD CONSTRAINT fk_projects_project_manager_id FOREIGN KEY (project_manager_id)
REFERENCES auth.users(id) ON DELETE SET NULL;

-- 9. Add FK constraints on tasks.assigned_to
ALTER TABLE tasks
ADD CONSTRAINT fk_tasks_assigned_to FOREIGN KEY (assigned_to)
REFERENCES auth.users(id) ON DELETE SET NULL;

-- 10. Add FK constraint on tasks.created_by
ALTER TABLE tasks
ADD CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by)
REFERENCES auth.users(id) ON DELETE SET NULL;

-- 11. Add FK constraint on task_dependencies.created_by
ALTER TABLE task_dependencies
ADD CONSTRAINT fk_task_dependencies_created_by FOREIGN KEY (created_by)
REFERENCES auth.users(id) ON DELETE SET NULL;

-- 12. Add FK constraint on time_entries.user_id
ALTER TABLE time_entries
ADD CONSTRAINT fk_time_entries_user_id FOREIGN KEY (user_id)
REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add indices on user_id for faster queries
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);
CREATE INDEX IF NOT EXISTS project_documents_user_id_idx ON project_documents(user_id);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON tasks(assigned_to);
