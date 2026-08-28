import { calculateProjectMetrics } from './project-metrics'
import {
  getMyProjects,
  getProjectTasks,
  type ProjectPreview,
  type TaskPreview,
} from '../../../lib/pm'

type SetProjects = (value: ProjectPreview[] | ((prev: ProjectPreview[]) => ProjectPreview[])) => void

interface ProjectSyncConfig {
  setProjects: SetProjects
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

  const reloadProjectsOnly = async () => {
    const nextProjects = await getMyProjects()
    const nextProjectsWithMetrics = await hydrateProjectsWithTaskMetrics(nextProjects)
    config.setProjects(nextProjectsWithMetrics)
    return nextProjectsWithMetrics
  }

  return {
    applyProjectMetricsFromTasks,
    hydrateProjectsWithTaskMetrics,
    reloadProjectsOnly,
  }
}
