/**
 * Map AI-generated drafts to domain operations
 * Converts AiProjectDraft into pm.* function calls
 */

import type { AiProjectDraft } from './ai.types'
import { supabase } from '../supabase'

interface CreateProjectFromDraftResult {
  success: boolean
  project_id: string
  estimate_id: string
  task_count: number
  work_package_count: number
}

/**
 * Create a complete project from an AI draft using atomic RPC
 * 
 * This ensures that all operations (project, estimate, work packages, tasks)
 * succeed together or fail together — no partial state.
 * 
 * Advantages:
 * - Single database transaction
 * - Automatic rollback on any error
 * - No orphaned projects or inconsistent hierarchies
 */
export async function createProjectFromAiDraft(draft: AiProjectDraft) {
  try {
    // Prepare tasks in flat format with work package reference
    const tasks = draft.estimates.work_packages.flatMap((wp) =>
      wp.tasks.map((task) => ({
        work_package_name: wp.name,
        title: task.title,
        description: task.description ?? null,
        priority: task.priority,
        status: task.status || 'todo',
        estimate_hours: task.estimate_hours,
      }))
    )

    // Call atomic RPC function
    const { data, error } = await supabase.rpc('create_project_from_ai_draft', {
      p_project_name: draft.project.name,
      p_project_customer_name: draft.project.customer_name ?? null,
      p_project_start_date: draft.project.start_date ?? null,
      p_project_end_date: draft.project.end_date ?? null,
      p_project_estimated_hours: draft.project.estimated_hours ?? null,
      p_project_budget_amount: draft.project.budget_amount ?? null,
      p_work_packages: draft.estimates.work_packages.map((wp) => ({
        name: wp.name,
        estimated_hours: wp.estimated_hours,
      })),
      p_tasks: tasks,
    })

    if (error) {
      throw new Error(error.message || 'Failed to create project from AI draft')
    }

    if (!data || typeof data !== 'object' || !('success' in data) || !data.success) {
      throw new Error('Unexpected response from server')
    }

    const result = data as CreateProjectFromDraftResult

    return {
      success: true,
      projectId: result.project_id,
      estimateId: result.estimate_id,
      taskCount: result.task_count,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error creating project from AI draft:', error)
    throw new Error(`Failed to create project from AI draft: ${message}`, {
      cause: error,
    })
  }
}
