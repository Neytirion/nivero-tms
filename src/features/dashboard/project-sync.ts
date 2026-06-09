import { calculateProjectMetrics } from './project-metrics'
import {
  getMyProjects,
  getProjectMembers,
  getProjectTasks,
  type ProjectMemberListItem,
  type ProjectPreview,
  type TaskPreview,
} from '../../lib/pm'

type SetProjects = (value: ProjectPreview[] | ((prev: ProjectPreview[]) => ProjectPreview[])) => void
type SetTasks = (value: TaskPreview[] | ((prev: TaskPreview[]) => TaskPreview[])) => void
type SetProjectMembers =
  (value: ProjectMemberListItem[] | ((prev: ProjectMemberListItem[]) => ProjectMemberListItem[])) => void
type SetSelectedProjectId = (value: string | null | ((prev: string | null) => string | null)) => void

interface ProjectSyncConfig {
  setProjects: SetProjects
  setTasks: SetTasks
  setProjectMembers: SetProjectMembers
  setSelectedProjectId: SetSelectedProjectId
}

export function createProjectSyncActions(config: ProjectSyncConfig) {
  const applyProjectMetricsFromTasks = (projectId: string, projectTasks: TaskPreview[]) => {
    config.setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) {
          return project
        }
        const metrics = calculateProjectMetrics(project, projectTasks)

        return {
          ...project,
          progress_percent: metrics.progressPercent,
          actual_hours: metrics.actualHours,
          risk_status: metrics.riskStatus,
        }
      }),
    )
  }

  const mergeProjectMetrics = (project: ProjectPreview, projectTasks: TaskPreview[]) => {
    const metrics = calculateProjectMetrics(project, projectTasks)

    return {
      ...project,
      progress_percent: metrics.progressPercent,
      actual_hours: metrics.actualHours,
      risk_status: metrics.riskStatus,
    }
  }

  const hydrateProjectsWithTaskMetrics = async (projectList: ProjectPreview[]) => {
    const projectsWithMetrics = await Promise.all(
      projectList.map(async (project) => {
        const projectTasks = await getProjectTasks(project.id)
        return mergeProjectMetrics(project, projectTasks)
      }),
    )

    return projectsWithMetrics
  }

  const loadTasksByProject = async (projectId: string) => {
    const [nextTasks, nextMembers] = await Promise.all([
      getProjectTasks(projectId),
      getProjectMembers(projectId),
    ])
    config.setTasks(nextTasks)
    config.setProjectMembers(nextMembers)
    config.setSelectedProjectId(projectId)
    applyProjectMetricsFromTasks(projectId, nextTasks)
    return nextTasks
  }

  const reloadProjectsOnly = async () => {
    const nextProjects = await getMyProjects()
    const nextProjectsWithMetrics = await hydrateProjectsWithTaskMetrics(nextProjects)
    config.setProjects(nextProjectsWithMetrics)
    return nextProjectsWithMetrics
  }

  const refreshProjectSnapshot = async (projectId: string) => {
    const nextTasks = await loadTasksByProject(projectId)
    await reloadProjectsOnly()
    applyProjectMetricsFromTasks(projectId, nextTasks)
    return nextTasks
  }

  return {
    applyProjectMetricsFromTasks,
    hydrateProjectsWithTaskMetrics,
    loadTasksByProject,
    reloadProjectsOnly,
    refreshProjectSnapshot,
  }
}
