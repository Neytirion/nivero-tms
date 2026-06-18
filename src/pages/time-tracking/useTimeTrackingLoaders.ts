import { useCallback } from 'react'
import {
  getProjectTasks,
  getTimeEntries,
  type ProjectPreview,
  type TaskPreview,
  type TimeEntryPreview,
} from '../../lib/pm'

interface UseTimeTrackingLoadersInput {
  projects: ProjectPreview[]
  currentUserId: string | null
  activeProjectId: string
  weekRange: { startDate: string; endDate: string }
  setStatus: (status: string) => void
  setEntries: (entries: TimeEntryPreview[]) => void
  setIsEntriesLoading: (isLoading: boolean) => void
  setProjectTasks: (tasks: TaskPreview[]) => void
  setTaskLabelById: (labels: Record<string, string>) => void
  setIsTaskLabelsLoading: (isLoading: boolean) => void
}

export function useTimeTrackingLoaders(input: UseTimeTrackingLoadersInput) {
  const loadWeekEntries = useCallback(async () => {
    input.setIsEntriesLoading(true)

    try {
      const nextEntries = await getTimeEntries({
        fromDate: input.weekRange.startDate,
        toDate: input.weekRange.endDate,
        projectId: input.activeProjectId || undefined,
      })
      input.setEntries(nextEntries)
    } catch (error) {
      input.setStatus(
        error instanceof Error
          ? `Time entries load error: ${error.message}`
          : 'Time entries load error',
      )
      input.setEntries([])
    }

    input.setIsEntriesLoading(false)
  }, [input])

  const loadProjectTasks = useCallback(async () => {
    input.setIsTaskLabelsLoading(true)

    if (!input.activeProjectId) {
      try {
        const tasksByProject = await Promise.all(
          input.projects.map(async (project) => ({
            tasks: await getProjectTasks(project.id),
          })),
        )

        const allTasks = tasksByProject.flatMap((item) => item.tasks)
        input.setProjectTasks(allTasks)
        input.setTaskLabelById(
          allTasks.reduce<Record<string, string>>((acc, task) => {
            acc[task.id] = task.title
            return acc
          }, {}),
        )
      } catch (error) {
        input.setStatus(
          error instanceof Error
            ? `Task load error: ${error.message}`
            : 'Task load error',
        )
        input.setProjectTasks([])
        input.setTaskLabelById({})
      } finally {
        input.setIsTaskLabelsLoading(false)
      }

      return
    }

    try {
      const nextTasks = await getProjectTasks(input.activeProjectId)
      const visibleTasks = nextTasks.filter((task) => {
        if (!input.currentUserId) {
          return true
        }

        return task.assigned_to === input.currentUserId
      })

      input.setProjectTasks(visibleTasks)
      input.setTaskLabelById(
        nextTasks.reduce<Record<string, string>>((acc, task) => {
          acc[task.id] = task.title
          return acc
        }, {}),
      )
    } catch (error) {
      input.setStatus(
        error instanceof Error ? `Task load error: ${error.message}` : 'Task load error',
      )
      input.setProjectTasks([])
      input.setTaskLabelById({})
    } finally {
      input.setIsTaskLabelsLoading(false)
    }
  }, [input])

  return {
    loadWeekEntries,
    loadProjectTasks,
  }
}
