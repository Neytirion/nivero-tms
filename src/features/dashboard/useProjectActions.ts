import { useCallback, useRef } from 'react'
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

interface ProjectActionsDeps {
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

/**
 * Hook that exposes memoized project CRUD actions.
 * Uses a ref to always read the latest deps without re-creating callbacks.
 */
export function useProjectActions(deps: ProjectActionsDeps) {
  const depsRef = useRef(deps)
  depsRef.current = deps

  const addProject = useCallback(
    async (input: {
      name: string
      description?: string
      customerName?: string
      startDate?: string
      endDate?: string
      estimatedHours?: number
      budgetAmount?: number
    }) => {
      const { setIsLoading, setStatus, setProjects, setSelectedProjectId } = depsRef.current

      setIsLoading(true)

      try {
        const createdProject = await createProject(input)
        setProjects((prev) => [createdProject, ...prev])
        setSelectedProjectId(createdProject.id)
        setStatus(`Project created: ${createdProject.name}`)
      } catch (error) {
        if (error instanceof Error && error.message.includes('row-level security policy')) {
          setStatus('Create project error: RLS blocks insert. Run the policies SQL in Supabase SQL Editor, then retry.')
        } else {
          setStatus(error instanceof Error ? `Create project error: ${error.message}` : 'Unknown error')
        }
      }

      setIsLoading(false)
    },
    [],
  )

  const editProject = useCallback(
    async (
      projectId: string,
      patch: { name?: string; description?: string; customerName?: string; deadlineAt?: string; startDate?: string; budgetAmount?: string; useEstimates?: boolean },
    ) => {
      const { ensureProjectEditable, canManageProject, setStatus, setIsLoading, setProjects } = depsRef.current

      if (!ensureProjectEditable(projectId, 'edit project')) return false
      if (!canManageProject(projectId)) {
        setStatus('Permission denied: only owner or admin can edit this project')
        return false
      }
      if (!patch.name?.trim()) {
        setStatus('Project name is required')
        return false
      }

      setIsLoading(true)

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
        setProjects((prev) => prev.map((p) => (p.id === projectId ? updatedProject : p)))
        setStatus(`Project updated: ${updatedProject.name}`)
        return true
      } catch (error) {
        setStatus(error instanceof Error ? `Update project error: ${error.message}` : 'Unknown error')
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const removeProject = useCallback(
    async (projectId: string) => {
      const { canDeleteProject, projects, selectedProjectId, setStatus, setIsLoading, setProjects, setSelectedProjectId } =
        depsRef.current

      if (!canDeleteProject(projectId)) {
        setStatus('Permission denied: only owner can delete completed projects')
        return
      }

      setIsLoading(true)

      try {
        await deleteProject(projectId)
        const nextProjects = projects.filter((p) => p.id !== projectId)
        setProjects(nextProjects)

        if (selectedProjectId === projectId) {
          setSelectedProjectId(nextProjects.length > 0 ? nextProjects[0].id : null)
        }

        setStatus('Project deleted')
      } catch (error) {
        setStatus(error instanceof Error ? `Delete project error: ${error.message}` : 'Unknown error')
      }

      setIsLoading(false)
    },
    [],
  )

  const completeSelectedProject = useCallback(
    async () => {
      const { selectedProjectId, isProjectCompleted, canManageProject, setStatus, setIsLoading, setProjects } =
        depsRef.current

      if (!selectedProjectId) {
        setStatus('Select a project before completing it')
        return
      }
      if (isProjectCompleted(selectedProjectId)) {
        setStatus('Project is already completed')
        return
      }
      if (!canManageProject(selectedProjectId)) {
        setStatus('Permission denied: only owner, admin, or manager can complete this project')
        return
      }

      setIsLoading(true)

      try {
        const latestTasks = await getProjectTasks(selectedProjectId)
        const incompleteCount = latestTasks.filter((task: TaskPreview) => !isTaskClosedStatus(task.status)).length
        if (incompleteCount > 0) {
          setStatus(`Cannot complete project: ${incompleteCount} unfinished task(s) remain`)
          setIsLoading(false)
          return
        }

        const completedProject = await completeProject(selectedProjectId)
        setProjects((prev) => prev.map((p) => (p.id === selectedProjectId ? completedProject : p)))
        setStatus(`Project completed: ${completedProject.name}`)
      } catch (error) {
        setStatus(error instanceof Error ? `Complete project error: ${error.message}` : 'Unknown error')
      }

      setIsLoading(false)
    },
    [],
  )

  return { addProject, editProject, removeProject, completeSelectedProject }
}
