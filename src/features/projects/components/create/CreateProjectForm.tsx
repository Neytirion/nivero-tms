interface CreateProjectFormProps {
  projectName: string
  projectDescription: string
  projectDeadline: string
  isLoading: boolean
  onProjectNameChange: (value: string) => void
  onProjectDescriptionChange: (value: string) => void
  onProjectDeadlineChange: (value: string) => void
  onCreate: () => void | Promise<void>
  onRefresh: () => void | Promise<void>
}

export function CreateProjectForm({
  projectName,
  projectDescription,
  projectDeadline,
  isLoading,
  onProjectNameChange,
  onProjectDescriptionChange,
  onProjectDeadlineChange,
  onCreate,
  onRefresh,
}: CreateProjectFormProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-base font-semibold text-black">Create Project</h2>
      <div className="mt-3 space-y-2">
        <input
          type="text"
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
          placeholder="Project name"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
        />
        <input
          type="text"
          value={projectDescription}
          onChange={(event) => onProjectDescriptionChange(event.target.value)}
          placeholder="Project description"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
        />
        <input
          type="date"
          value={projectDeadline}
          onChange={(event) => onProjectDeadlineChange(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void onCreate()}
            disabled={isLoading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create project
          </button>
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={isLoading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
