import type { ProjectPreview } from '../../../../lib/pm'
import { deriveProgress, deriveRisk } from '../../utils/project-metrics'

interface ProjectsTableProps {
  searchValue: string
  onSearchChange: (value: string) => void
  isLoading: boolean
  onOpenCreateProject?: () => void
  onRefresh: () => void | Promise<void>
  projects: ProjectPreview[]
  selectedProjectId: string | null
  onSelectProject: (projectId: string) => void | Promise<void>
  onOpenProjectSettings?: (projectId: string) => void | Promise<void>
  canManageProject?: (projectId: string) => boolean
  onDeleteProject?: (projectId: string) => void | Promise<void>
}

export function ProjectsTable({
  searchValue,
  onSearchChange,
  isLoading,
  onOpenCreateProject,
  onRefresh,
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenProjectSettings,
  canManageProject,
  onDeleteProject,
}: ProjectsTableProps) {
  return (
    <section className="page-section">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="section-title">Projects</h3>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by project, customer, description..."
            className="w-[320px] max-w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
          />
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={isLoading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
          {onOpenCreateProject ? (
            <button
              type="button"
              onClick={onOpenCreateProject}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600"
            >
              + New Project
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full border-collapse bg-white text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Project</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Progress</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Hours</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  No matching projects
                </td>
              </tr>
            ) : (
              projects.map((project) => {
                const progress = deriveProgress(project)
                const risk = deriveRisk(project)

                return (
                  <tr
                    key={project.id}
                    onClick={() => void onSelectProject(project.id)}
                    className={`cursor-pointer border-t border-slate-200 transition hover:bg-cyan-50 ${
                      selectedProjectId === project.id ? 'bg-cyan-50/80' : 'bg-white'
                    }`}
                  >
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-900">{project.name}</p>
                      <p className="text-xs text-slate-500">{project.description || 'No description'}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          (project.status ?? '').toLowerCase() === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-cyan-100 text-cyan-800'
                        }`}
                      >
                        {project.status ?? 'active'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-800">{progress}%</p>
                      <p className="text-[11px] text-slate-500">Risk: {risk}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{project.customer_name ?? 'Not set'}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {(project.actual_hours ?? 0).toFixed(1)} / {(project.estimated_hours ?? 0).toFixed(1)}
                    </td>
                    <td className="px-3 py-2">
                      {onOpenProjectSettings ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void onOpenProjectSettings(project.id)
                          }}
                          className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                          Settings
                        </button>
                      ) : canManageProject && onDeleteProject && canManageProject(project.id) ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void onDeleteProject(project.id)
                          }}
                          className="rounded-md bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-200"
                        >
                          Delete
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
