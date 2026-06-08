import type { ProjectPreview, TaskPreview } from '../../lib/pm'
import { deriveRiskFromProgressAndHours } from '../projects/utils/project-metrics.ts'
import { isTaskClosedStatus } from '../../shared/utils/task-status.ts'

export function calculateProjectMetrics(project: ProjectPreview, projectTasks: TaskPreview[]) {
  const totalTasks = projectTasks.length
  const doneTasks = projectTasks.filter((task) => isTaskClosedStatus(task.status)).length

  const totalEstimatedHoursFromTasks = projectTasks.reduce((sum, task) => {
    const estimate = task.estimate_hours ?? 0
    return sum + (estimate > 0 ? estimate : 0)
  }, 0)

  const doneEstimatedHoursFromTasks = projectTasks.reduce((sum, task) => {
    if (!isTaskClosedStatus(task.status)) {
      return sum
    }

    const estimate = task.estimate_hours ?? 0
    return sum + (estimate > 0 ? estimate : 0)
  }, 0)

  const progressPercent =
    totalEstimatedHoursFromTasks > 0
      ? Math.round((doneEstimatedHoursFromTasks / totalEstimatedHoursFromTasks) * 100)
      : totalTasks === 0
        ? 0
        : Math.round((doneTasks / totalTasks) * 100)

  const rolledActualHours = projectTasks.reduce((sum, task) => {
    const actual = task.actual_hours ?? 0
    return sum + (actual > 0 ? actual : 0)
  }, 0)

  const nextRiskLabel = deriveRiskFromProgressAndHours({
    progressPercent,
    estimatedHours: project.estimated_hours,
    actualHours: rolledActualHours,
  })

  const riskStatus: 'green' | 'yellow' | 'red' =
    nextRiskLabel === 'Red' ? 'red' : nextRiskLabel === 'Amber' ? 'yellow' : 'green'

  return {
    progressPercent,
    actualHours: Number(rolledActualHours.toFixed(2)),
    riskStatus,
  }
}
