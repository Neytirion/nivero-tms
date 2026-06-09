import type { ProjectPreview } from '../../../../../lib/pm'
import { deriveProgress, deriveRisk, formatDate } from '../../../utils/project-metrics'

interface ProjectOverviewTabProps {
  selectedProject: ProjectPreview
  projectManagerName?: string
  teamMemberNames: string[]
}

export function ProjectOverviewTab({
  selectedProject,
  projectManagerName,
  teamMemberNames,
}: ProjectOverviewTabProps) {
  return (
    <div className="mt-4 grid gap-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <h4 className="text-sm font-semibold text-slate-900">Overview</h4>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dates</p>
            <div className="mt-2 space-y-1.5 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Start:</span> {formatDate(selectedProject.start_date)}</p>
              <p><span className="font-semibold text-slate-900">End:</span> {formatDate(selectedProject.end_date)}</p>
              <p><span className="font-semibold text-slate-900">Created:</span> {formatDate(selectedProject.created_at)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project Info</p>
            <div className="mt-2 space-y-1.5 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Customer:</span> {selectedProject.customer_name ?? 'Not set'}</p>
              <p>
                <span className="font-semibold text-slate-900">Project Manager:</span>{' '}
                {projectManagerName ?? (selectedProject.project_manager_id ? 'Assigned' : 'Not set')}
              </p>
              <p><span className="font-semibold text-slate-900">Status:</span> {selectedProject.status ?? 'active'}</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery & Team</p>
            <div className="mt-2 space-y-1.5 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Progress:</span> {deriveProgress(selectedProject)}%</p>
              <p><span className="font-semibold text-slate-900">Estimated:</span> {(selectedProject.estimated_hours ?? 0).toFixed(1)}h</p>
              <p><span className="font-semibold text-slate-900">Actual:</span> {(selectedProject.actual_hours ?? 0).toFixed(1)}h</p>
              <p><span className="font-semibold text-slate-900">Risk:</span> {deriveRisk(selectedProject)}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {teamMemberNames.length === 0 ? (
                <span className="text-xs text-slate-500">No members yet</span>
              ) : (
                teamMemberNames.map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700"
                  >
                    {name}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
