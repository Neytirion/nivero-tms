import type { ProjectPreview } from '../../../../lib/pm'
import { ConfirmDialog } from '../../../../shared/components'
import { useState } from 'react'

interface ProjectsListProps {
  projects: ProjectPreview[]
  selectedProjectId: string | null
  canManageProject: (projectId: string) => boolean
  onSelect: (projectId: string) => void | Promise<void>
  onDelete: (projectId: string) => void | Promise<void>
}

export function ProjectsList({
  projects,
  selectedProjectId,
  canManageProject,
  onSelect,
  onDelete,
}: ProjectsListProps) {
  const [pendingDeleteProject, setPendingDeleteProject] = useState<ProjectPreview | null>(null)

  const formatDate = (value: string | null | undefined) => {
    if (!value) {
      return 'not set'
    }

    return new Date(value).toLocaleDateString()
  }

  const confirmDelete = async () => {
    if (!pendingDeleteProject) {
      return
    }

    await onDelete(pendingDeleteProject.id)
    setPendingDeleteProject(null)
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-base font-semibold text-black">Projects List</h2>

      <div className="mt-3 space-y-2 text-sm text-slate-700">
        {projects.length === 0 ? <p className="text-slate-500">No projects yet</p> : null}
        {projects.map((project) => (
          <div
            key={project.id}
            className={`rounded-md border px-3 py-2 ${
              selectedProjectId === project.id
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="w-full">
                <button type="button" onClick={() => void onSelect(project.id)} className="text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{project.name}</p>
                    {project.status === 'completed' ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        Completed
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Created: {formatDate(project.created_at)} | Deadline: {formatDate(project.deadline_at)}
                  </p>
                </button>
              </div>

              <div className="flex gap-1">
                {canManageProject(project.id) ? (
                  <button
                    type="button"
                    onClick={() => setPendingDeleteProject(project)}
                    className="rounded-md bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-200"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteProject)}
        title="Delete project"
        description={`Delete "${pendingDeleteProject?.name ?? ''}"? This action cannot be undone.`}
        confirmText="Delete project"
        tone="danger"
        onCancel={() => setPendingDeleteProject(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
