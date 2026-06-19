interface ProjectSettingsTabProps {
  settingsName: string
  onSettingsNameChange: (value: string) => void
  settingsDescription: string
  onSettingsDescriptionChange: (value: string) => void
  settingsCustomerName: string
  onSettingsCustomerNameChange: (value: string) => void
  settingsStartDate: string
  onSettingsStartDateChange: (value: string) => void
  settingsDeadline: string
  onSettingsDeadlineChange: (value: string) => void
  canEditSelectedProject: boolean
  canDeleteSelectedProject?: boolean
  isLoading: boolean
  onOpenSaveSettingsConfirm: () => void
  onOpenDeleteConfirm?: () => void
}

export function ProjectSettingsTab({
  settingsName,
  onSettingsNameChange,
  settingsDescription,
  onSettingsDescriptionChange,
  settingsCustomerName,
  onSettingsCustomerNameChange,
  settingsStartDate,
  onSettingsStartDateChange,
  settingsDeadline,
  onSettingsDeadlineChange,
  canEditSelectedProject,
  canDeleteSelectedProject,
  isLoading,
  onOpenSaveSettingsConfirm,
  onOpenDeleteConfirm,
}: ProjectSettingsTabProps) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h4 className="text-sm font-semibold text-slate-900">Project Settings</h4>
      <div className="mt-3 space-y-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Project Name</span>
          <input
            type="text"
            value={settingsName}
            onChange={(event) => onSettingsNameChange(event.target.value)}
            placeholder="Project name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={!canEditSelectedProject}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Project Description</span>
          <input
            type="text"
            value={settingsDescription}
            onChange={(event) => onSettingsDescriptionChange(event.target.value)}
            placeholder="Project description"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={!canEditSelectedProject}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Customer</span>
          <input
            type="text"
            value={settingsCustomerName}
            onChange={(event) => onSettingsCustomerNameChange(event.target.value)}
            placeholder="Customer name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={!canEditSelectedProject}
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Start Date</span>
            <input
              type="date"
              value={settingsStartDate}
              onChange={(event) => onSettingsStartDateChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              disabled={!canEditSelectedProject}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Planned End Date</span>
            <input
              type="date"
              value={settingsDeadline}
              onChange={(event) => onSettingsDeadlineChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              disabled={!canEditSelectedProject}
            />
          </label>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenSaveSettingsConfirm}
          disabled={!canEditSelectedProject || isLoading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save settings
        </button>
        {onOpenDeleteConfirm ? (
          <button
            type="button"
            onClick={onOpenDeleteConfirm}
            disabled={!canDeleteSelectedProject || isLoading}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete project
          </button>
        ) : null}
      </div>
    </div>
  )
}
