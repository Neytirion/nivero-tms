import { useEffect, useMemo, useState } from 'react'
import type { ProjectPreview } from '../../../../lib/pm'
import { deriveProgress, deriveRisk } from '../../utils/project-metrics'

interface ProjectsTableProps {
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  isLoading: boolean
  onOpenCreateProject?: () => void
  onRefresh: () => void | Promise<void>
  allProjects: ProjectPreview[]
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
  onSearchSubmit,
  isLoading,
  onOpenCreateProject,
  onRefresh,
  allProjects,
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenProjectSettings,
  canManageProject,
  onDeleteProject,
}: ProjectsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  const normalizedQuery = searchValue.trim().toLowerCase()

  const deduplicatedSuggestions = Array.from(
    allProjects
      .flatMap((project) => [project.name, project.customer_name ?? ''])
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .reduce((acc, value) => {
        const key = value.toLowerCase()

        if (!acc.has(key)) {
          acc.set(key, value)
        }

        return acc
      }, new Map<string, string>())
      .values(),
  )

  const suggestionValues = deduplicatedSuggestions
    .filter((value) => {
      if (!normalizedQuery) {
        return true
      }

      return value.toLowerCase().includes(normalizedQuery)
    })
    .sort((left, right) => {
      const leftLower = left.toLowerCase()
      const rightLower = right.toLowerCase()

      const rank = (value: string) => {
        if (!normalizedQuery) {
          return 3
        }
        if (value === normalizedQuery) {
          return 0
        }
        if (value.startsWith(normalizedQuery)) {
          return 1
        }
        return 2
      }

      const rankDiff = rank(leftLower) - rank(rightLower)
      if (rankDiff !== 0) {
        return rankDiff
      }

      return left.localeCompare(right)
    })
    .slice(0, 8)

  const totalPages = Math.max(1, Math.ceil(projects.length / pageSize))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const visibleProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return projects.slice(start, start + pageSize)
  }, [currentPage, projects])

  return (
    <section className="page-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h3 className="section-title">Projects</h3>
          <form
            className="flex w-full max-w-full items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              onSearchSubmit()
            }}
          >
            <input
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by project, customer, description..."
              list="projects-search-suggestions"
              className="w-[320px] max-w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
            />
            <datalist id="projects-search-suggestions">
              {suggestionValues.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Search
            </button>
          </form>
        </div>
        <div className="flex items-center gap-2">
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
              <th className="px-3 py-2">Risk</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Hours</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  No matching projects
                </td>
              </tr>
            ) : (
              visibleProjects.map((project) => {
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
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          risk === 'Red'
                            ? 'bg-rose-100 text-rose-700'
                            : risk === 'Amber'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {risk}
                      </span>
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

      {projects.length > pageSize ? (
        <div className="mt-3 flex flex-col items-center justify-center gap-2 text-sm text-slate-600">
          <p>
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
