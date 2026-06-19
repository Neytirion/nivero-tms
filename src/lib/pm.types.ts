import type { Database } from './database.types'

export type Project = Database['public']['Tables']['projects']['Row']
export type Estimate = Database['public']['Tables']['estimates']['Row']
export type WorkPackage = Database['public']['Tables']['work_packages']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type CommentMention = Database['public']['Tables']['comment_mentions']['Row']
export type ActivityEvent = Database['public']['Tables']['activity_events']['Row']
export type ProjectWikiPage = Database['public']['Tables']['project_wiki_pages']['Row']
export type ProjectDocument = Database['public']['Tables']['project_documents']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type TimeEntry = Database['public']['Tables']['time_entries']['Row']

export type ProjectPreview = Pick<
  Project,
  | 'id'
  | 'name'
  | 'description'
  | 'owner_id'
  | 'customer_name'
  | 'project_manager_id'
  | 'start_date'
  | 'end_date'
  | 'estimated_hours'
  | 'actual_hours'
  | 'budget_amount'
  | 'progress_percent'
  | 'risk_status'
  | 'status'
  | 'completed_at'
  | 'deadline_at'
  | 'created_at'
>

export type TaskPreview = Pick<
  Task,
  | 'id'
  | 'work_package_id'
  | 'title'
  | 'description'
  | 'status'
  | 'priority'
  | 'assigned_to'
  | 'created_by'
  | 'estimate_hours'
  | 'actual_hours'
  | 'blocked_by_task_id'
  | 'due_date'
  | 'project_id'
  | 'created_at'
>

export type ProjectMemberPreview = Pick<
  Database['public']['Tables']['project_members']['Row'],
  'project_id' | 'role'
>

export type ProjectMemberListItem = Pick<
  Database['public']['Functions']['get_project_members_with_profile']['Returns'][number],
  'member_id' | 'project_id' | 'user_id' | 'role' | 'joined_at' | 'full_name' | 'email'
>

export type TimeEntryPreview = Pick<
  TimeEntry,
  | 'id'
  | 'user_id'
  | 'project_id'
  | 'task_id'
  | 'entry_date'
  | 'minutes_spent'
  | 'is_billable'
  | 'notes'
  | 'started_at'
  | 'ended_at'
  | 'created_at'
>

export type EstimatePreview = Pick<
  Estimate,
  'id' | 'project_id' | 'version_number' | 'status' | 'created_by' | 'approved_at' | 'created_at' | 'updated_at'
>

export type WorkPackagePreview = Pick<
  WorkPackage,
  'id' | 'estimate_id' | 'name' | 'estimated_hours' | 'sort_order' | 'is_active' | 'created_at'
>

export type ProjectTaskWorkPackagePreview = Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours'>

export type EstimateWithPackages = EstimatePreview & {
  work_packages: WorkPackagePreview[]
}

export type CommentPreview = Pick<Comment, 'id' | 'project_id' | 'task_id' | 'user_id' | 'message' | 'created_at'>

export type CommentMentionPreview = Pick<
  CommentMention,
  'id' | 'project_id' | 'comment_id' | 'task_id' | 'mentioned_user_id' | 'mentioned_by_user_id' | 'created_at'
>

export type ActivityEventPreview = Pick<
  ActivityEvent,
  'id' | 'project_id' | 'actor_user_id' | 'event_type' | 'entity_type' | 'entity_id' | 'payload' | 'created_at'
>

export type ProjectWikiPagePreview = Pick<
  ProjectWikiPage,
  'id' | 'project_id' | 'title' | 'content' | 'updated_by' | 'created_at' | 'updated_at'
>

export type ProjectDocumentPreview = Pick<
  ProjectDocument,
  'id' | 'project_id' | 'user_id' | 'file_url' | 'name' | 'mime_type' | 'size_bytes' | 'created_at'
>

export interface CreateProjectInput {
  name: string
  customerName?: string
  startDate?: string
  endDate?: string
  estimatedHours?: number
  budgetAmount?: number
}

export interface UpdateProjectInput {
  name: string
  description?: string
  customer_name?: string
  deadline_at?: string
  start_date?: string
  budget_amount?: number
}

export interface CreateTaskInput {
  projectId: string
  workPackageId?: string
  title: string
  description?: string
  status?: string
  priority?: string
  assignedTo?: string
  estimateHours?: number
  actualHours?: number
  blockedByTaskId?: string
  dueDate?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: string
  priority?: string
  assigned_to?: string
  estimate_hours?: number
  actual_hours?: number
  blocked_by_task_id?: string
  due_date?: string
  work_package_id?: string
}

export interface AddProjectMemberInput {
  projectId: string
  userId: string
  role?: string
}

export interface InviteProjectMemberByEmailInput {
  projectId: string
  email: string
  role?: string
}

export interface UpdateProjectMemberRoleInput {
  projectId: string
  userId: string
  role: string
}

export interface RemoveProjectMemberInput {
  projectId: string
  userId: string
  unassignUnfinishedTasks: boolean
}

export interface CreateTimeEntryInput {
  projectId: string
  taskId?: string
  entryDate: string
  hoursSpent: number
  isBillable: boolean
  notes?: string
}

export interface UpdateTimeEntryInput {
  projectId: string
  taskId?: string
  entryDate: string
  hoursSpent: number
  isBillable: boolean
  notes?: string
}

export interface GetTimeEntriesInput {
  projectId?: string
  fromDate?: string
  toDate?: string
}

export interface SaveEstimateDraftInput {
  estimateId: string
  workPackages: Array<{
    name: string
    estimatedHours: number
  }>
}

export interface UploadProjectDocumentInput {
  projectId: string
  file: File
}

export interface SaveProjectWikiInput {
  projectId: string
  title: string
  content: string
}