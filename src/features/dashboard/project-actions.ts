import {
  completeProject,
  createProject,
  deleteProject,
  getProjectTasks,
  updateProject,
  type TaskPreview,
  type ProjectPreview,
} from '../../lib/pm'
import { isTaskClosedStatus } from '../../shared/utils/task-status.ts'

type SetStatus = (value: string | ((prev: string) => string)) => void
type SetIsLoading = (value: boolean | ((prev: boolean) => boolean)) => void
type SetProjects = (value: ProjectPreview[] | ((prev: ProjectPreview[]) => ProjectPreview[])) => void
type SetSelectedProjectId = (value: string | null | ((prev: string | null) => string | null)) => void

interface ProjectActionsConfig {
  projects: ProjectPreview[]
  selectedProjectId: string | null
  setStatus: SetStatus
  setIsLoading: SetIsLoading
  setProjects: SetProjects
  setSelectedProjectId: SetSelectedProjectId
  ensureProjectEditable: (projectId: string | null | undefined, action: string) => boolean
  canManageProject: (projectId: string) => boolean
  canDeleteProject: (projectId: string) => boolean
  isProjectCompleted: (projectId: string | null | undefined) => boolean
}

export function createProjectActions(config: ProjectActionsConfig) {
  const addProject = async (input: {
    name: string
    description?: string
    customerName?: string
    startDate?: string
    endDate?: string
    estimatedHours?: number
    budgetAmount?: number
  }) => {
    config.setIsLoading(true)

    try {
      const createdProject = await createProject(input)
      config.setProjects((prev) => [createdProject, ...prev])
      config.setSelectedProjectId(createdProject.id)
      // Tasks context reacts to selectedProjectId change and loads (empty) tasks automatically
      config.setStatus(`Project created: ${createdProject.name}`)
    } catch (error) {
      if (error instanceof Error && error.message.includes('row-level security policy')) {
        config.setStatus(
          'Create project error: RLS blocks insert. Run the policies SQL in Supabase SQL Editor, then retry.',
        )
      } else {
        config.setStatus(error instanceof Error ? `Create project error: ${error.message}` : 'Unknown error')
      }
    }

    config.setIsLoading(false)
  }

  const editProject = async (
    projectId: string,
    patch: { name?: string; description?: string; customerName?: string; deadlineAt?: string; startDate?: string; budgetAmount?: string; useEstimates?: boolean },
  ) => {
    if (!config.ensureProjectEditable(projectId, 'edit project')) {
      return false
    }

    if (!config.canManageProject(projectId)) {
      config.setStatus('Permission denied: only owner or admin can edit this project')
      return false
    }

    if (!patch.name?.trim()) {
      config.setStatus('Project name is required')
      return false
    }

    config.setIsLoading(true)

    try {
      const updatedProject = await updateProject(projectId, {
        name: patch.name.trim(),
        description: patch.description,
        customer_name: patch.customerName,
        deadline_at: patch.deadlineAt,
        start_date: patch.startDate,
        budget_amount: patch.budgetAmount ? Number(patch.budgetAmount) : undefined,
        use_estimates: patch.useEstimates,
      })

      config.setProjects((prev) =>
        prev.map((project) => (project.id === projectId ? updatedProject : project)),
      )
      config.setStatus(`Project updated: ${updatedProject.name}`)
      return true
    } catch (error) {
      config.setStatus(error instanceof Error ? `Update project error: ${error.message}` : 'Unknown error')
      return false
    } finally {
      config.setIsLoading(false)
    }
  }

  const removeProject = async (projectId: string) => {
    if (!config.canDeleteProject(projectId)) {
      config.setStatus('Permission denied: only owner can delete completed projects')
      return
    }

    config.setIsLoading(true)

    try {
      await deleteProject(projectId)
      const nextProjects = config.projects.filter((project) => project.id !== projectId)
      config.setProjects(nextProjects)

      if (config.selectedProjectId === projectId) {
        const nextProjectId = nextProjects.length > 0 ? nextProjects[0].id : null
        // Tasks context reacts to selectedProjectId change automatically
        config.setSelectedProjectId(nextProjectId)
      }

      config.setStatus('Project deleted')
    } catch (error) {
      config.setStatus(error instanceof Error ? `Delete project error: ${error.message}` : 'Unknown error')
    }

    config.setIsLoading(false)
  }

  const completeSelectedProject = async () => {
    if (!config.selectedProjectId) {
      config.setStatus('Select a project before completing it')
      return
    }

    if (config.isProjectCompleted(config.selectedProjectId)) {
      config.setStatus('Project is already completed')
      return
    }

    if (!config.canManageProject(config.selectedProjectId)) {
      config.setStatus('Permission denied: only owner, admin, or manager can complete this project')
      return
    }

    config.setIsLoading(true)

    try {
      const latestTasks = await getProjectTasks(config.selectedProjectId)
      // Validate all tasks are complete — read-only, tasks context state not mutated

      const incompleteTasksCount = latestTasks.filter((task: TaskPreview) => !isTaskClosedStatus(task.status)).length
      if (incompleteTasksCount > 0) {
        config.setStatus(`Cannot complete project: ${incompleteTasksCount} unfinished task(s) remain`)
        config.setIsLoading(false)
        return
      }

      const completedProject = await completeProject(config.selectedProjectId)
      config.setProjects((prev) =>
        prev.map((project) => (project.id === config.selectedProjectId ? completedProject : project)),
      )
      config.setStatus(`Project completed: ${completedProject.name}`)
    } catch (error) {
      config.setStatus(error instanceof Error ? `Complete project error: ${error.message}` : 'Unknown error')
    }

    config.setIsLoading(false)
  }

  return {
    addProject,
    editProject,
    removeProject,
    completeSelectedProject,
  }
}
