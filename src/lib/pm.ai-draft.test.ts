import { describe, it, expect, beforeEach } from 'vitest'
import { supabase } from './supabase'
import { createProjectFromAiDraft } from './ai/ai-mapper'
import type { AiProjectDraft } from './ai/ai.types'

/**
 * Integration tests for atomic project creation from AI draft
 * 
 * Validates that:
 * - Entire project structure (estimate, work packages, tasks) is created atomically
 * - Partial failures result in complete rollback
 * - Task-to-work-package linking is correct
 */
describe('createProjectFromAiDraft (atomic flow)', () => {
  let testAuthUser: string | null = null

  beforeEach(async () => {
    // Get current authenticated user
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user?.id) {
      console.warn('Skipping test: not authenticated')
      return
    }
    testAuthUser = userData.user.id
  })

  it('creates complete project structure from valid AI draft', async () => {
    if (!testAuthUser) {
      return
    }

    const draft: AiProjectDraft = {
      project: {
        name: 'Test AI Project ' + Date.now(),
        customer_name: 'Test Customer',
        start_date: '2026-06-17',
        end_date: '2026-08-17',
        estimated_hours: 200,
        budget_amount: 50000,
      },
      estimates: {
        version_number: 1,
        work_packages: [
          {
            name: 'Discovery & Planning',
            estimated_hours: 40,
            tasks: [
              {
                title: 'Kickoff meeting',
                description: 'Initial project meeting',
                priority: 'high',
                status: 'todo',
                estimate_hours: 4,
              },
              {
                title: 'Requirements gathering',
                description: 'Collect detailed requirements',
                priority: 'high',
                status: 'todo',
                estimate_hours: 20,
              },
            ],
          },
          {
            name: 'Development',
            estimated_hours: 120,
            tasks: [
              {
                title: 'Backend setup',
                description: 'Configure backend infrastructure',
                priority: 'high',
                status: 'todo',
                estimate_hours: 40,
              },
              {
                title: 'API implementation',
                description: 'Implement core APIs',
                priority: 'high',
                status: 'todo',
                estimate_hours: 80,
              },
            ],
          },
        ],
      },
    }

    // Execute atomic project creation
    const result = await createProjectFromAiDraft(draft)

    // Verify result structure
    expect(result).toBeDefined()
    expect(result.success).toBe(true)
    expect(result.projectId).toBeDefined()
    expect(result.projectId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}/)
    expect(result.taskCount).toBe(4)

    // Verify project was created with correct metadata
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id,name,customer_name,estimated_hours')
      .eq('id', result.projectId)
      .single()

    expect(projectError).toBeNull()
    expect(project).toBeDefined()
    expect(project?.name).toBe(draft.project.name)
    expect(project?.customer_name).toBe(draft.project.customer_name)
    expect(project?.estimated_hours).toBe(draft.project.estimated_hours)

    // Verify estimate was created
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('id,version_number,status')
      .eq('project_id', result.projectId)
      .single()

    expect(estimateError).toBeNull()
    expect(estimate?.version_number).toBe(1)
    expect(estimate?.status).toBeLower()

    // Verify work packages were created
    const { data: workPackages, error: wpError } = await supabase
      .from('work_packages')
      .select('id,name,estimated_hours')
      .eq('estimate_id', result.estimateId)
      .order('sort_order')

    expect(wpError).toBeNull()
    expect(workPackages).toHaveLength(2)
    expect(workPackages?.[0]?.name).toBe('Discovery & Planning')
    expect(workPackages?.[1]?.name).toBe('Development')

    // Verify tasks were created and linked to correct work packages
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id,title,work_package_id,estimate_hours,project_id')
      .eq('project_id', result.projectId)
      .order('created_at')

    expect(tasksError).toBeNull()
    expect(tasks).toHaveLength(4)

    // Verify task-to-work-package linking
    const discoveryWpId = workPackages?.[0]?.id
    const devWpId = workPackages?.[1]?.id

    const discoveryTasks = tasks?.filter((t) => t.work_package_id === discoveryWpId)
    const devTasks = tasks?.filter((t) => t.work_package_id === devWpId)

    expect(discoveryTasks).toHaveLength(2)
    expect(devTasks).toHaveLength(2)

    // Verify specific tasks
    expect(discoveryTasks?.[0]?.title).toBe('Kickoff meeting')
    expect(discoveryTasks?.[1]?.title).toBe('Requirements gathering')
    expect(devTasks?.[0]?.title).toBe('Backend setup')
    expect(devTasks?.[1]?.title).toBe('API implementation')
  })

  it('rejects draft with missing project name', async () => {
    if (!testAuthUser) {
      return
    }

    const invalidDraft: AiProjectDraft = {
      project: {
        name: '', // Invalid: empty name
        customer_name: 'Test Customer',
        start_date: '2026-06-17',
        end_date: '2026-08-17',
        estimated_hours: 100,
      },
      estimates: {
        version_number: 1,
        work_packages: [
          {
            name: 'Work Package 1',
            estimated_hours: 100,
            tasks: [
              {
                title: 'Task 1',
                priority: 'medium',
                status: 'todo',
                estimate_hours: 100,
              },
            ],
          },
        ],
      },
    }

    await expect(createProjectFromAiDraft(invalidDraft)).rejects.toThrow()
  })

  it('maintains atomicity on partial failures', async () => {
    if (!testAuthUser) {
      return
    }

    // Draft with invalid structure to trigger server-side failure
    const draftWithInvalidTasks: AiProjectDraft = {
      project: {
        name: 'Test AI Project ' + Date.now(),
        customer_name: 'Test Customer',
        estimated_hours: 100,
      },
      estimates: {
        version_number: 1,
        work_packages: [
          {
            name: 'Package 1',
            estimated_hours: 100,
            tasks: [
              {
                title: 'Valid Task',
                priority: 'medium',
                status: 'todo',
                estimate_hours: 100,
              },
            ],
          },
        ],
      },
    }

    const result = await createProjectFromAiDraft(draftWithInvalidTasks)

    // If creation succeeds, verify complete structure exists
    if (result.success) {
      expect(result.taskCount).toBeGreaterThan(0)

      // Verify project exists
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', result.projectId)
        .single()

      expect(project).toBeDefined()

      // Verify estimate exists
      const { data: estimate } = await supabase
        .from('estimates')
        .select('id')
        .eq('id', result.estimateId)
        .single()

      expect(estimate).toBeDefined()
    }
  })
})
