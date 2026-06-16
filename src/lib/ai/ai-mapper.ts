/**
 * Map AI-generated drafts to domain operations
 * Converts AiProjectDraft into pm.* function calls
 */

import type { AiProjectDraft } from './ai.types'
import { createProject } from '../pm.projects'
import { createEstimateVersion, getProjectTaskWorkPackages, saveEstimateDraft } from '../pm.estimates'
import { createTask } from '../pm.tasks'

/**
 * Create a complete project from an AI draft
 * This is a multi-step transaction:
 * 1. Create project
 * 2. Create estimate version
 * 3. Create work packages
 * 4. Create all tasks
 */
export async function createProjectFromAiDraft(draft: AiProjectDraft) {
  try {
    const project = await createProject({
      name: draft.project.name,
      customerName: draft.project.customer_name,
      startDate: draft.project.start_date,
      endDate: draft.project.end_date,
      estimatedHours: draft.project.estimated_hours,
      budgetAmount: draft.project.budget_amount,
    })

    const projectId = project.id

    const estimate = await createEstimateVersion(projectId)

    await saveEstimateDraft({
      estimateId: estimate.id,
      workPackages: draft.estimates.work_packages.map((workPackage) => ({
        name: workPackage.name,
        estimatedHours: workPackage.estimated_hours,
      })),
    })

    const workPackages = await getProjectTaskWorkPackages(projectId)
    const workPackageIdByName = new Map(
      workPackages.map((workPackage) => [workPackage.name.trim().toLowerCase(), workPackage.id]),
    )

    const taskResults = []

    for (const workPackage of draft.estimates.work_packages) {
      const workPackageId = workPackageIdByName.get(workPackage.name.trim().toLowerCase())

      for (const task of workPackage.tasks) {
        const taskResult = await createTask({
          projectId,
          workPackageId,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status || 'todo',
          estimateHours: task.estimate_hours,
        })

        taskResults.push(taskResult)
      }
    }

    return {
      success: true,
      projectId,
      estimateId: estimate.id,
      taskCount: taskResults.length,
    }
  } catch (error) {
    console.error('Error creating project from AI draft:', error)
    throw error
  }
}
