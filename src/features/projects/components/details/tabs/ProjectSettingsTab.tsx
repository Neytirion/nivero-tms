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
  selectedProjectClientIntakeToken: string | null
  canEditSelectedProject: boolean
  canDeleteSelectedProject?: boolean
  canCompleteSelectedProject?: boolean
  incompleteTaskCount?: number
  isProjectCompleted?: boolean
  isLoading: boolean
  onOpenSaveSettingsConfirm: () => void
  onOpenDeleteConfirm?: () => void
  onOpenCompleteConfirm?: () => void
}

function parseIsoDateToUtcTime(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  return Date.UTC(year, month - 1, day)
}

function getDurationDays(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) {
    return null
  }

  const startTime = parseIsoDateToUtcTime(startDate)
  const endTime = parseIsoDateToUtcTime(endDate)

  if (startTime === null || endTime === null || endTime < startTime) {
    return null
  }

  const dayInMs = 24 * 60 * 60 * 1000
  return Math.floor((endTime - startTime) / dayInMs) + 1
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
  selectedProjectClientIntakeToken,
  canEditSelectedProject,
  canDeleteSelectedProject,
  canCompleteSelectedProject,
  incompleteTaskCount,
  isProjectCompleted,
  isLoading,
  onOpenSaveSettingsConfirm,
  onOpenDeleteConfirm,
  onOpenCompleteConfirm,
}: ProjectSettingsTabProps) {
  const durationDays = getDurationDays(settingsStartDate, settingsDeadline)
  const clientIntakeUrl = selectedProjectClientIntakeToken
    ? `${window.location.origin}/client/${selectedProjectClientIntakeToken}`
    : null

  const handleCopyClientIntakeUrl = async () => {
    if (!clientIntakeUrl) {
      return
    }

    try {
      await navigator.clipboard.writeText(clientIntakeUrl)
    } catch {
      // Silent fallback: URL stays visible for manual copy.
    }
  }

  return (
    <div className="mt-4 space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-slate-900">Project information</h3>
            <p className="mt-1 text-sm text-slate-500">Update the name, description, and customer details.</p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Name</span>
          <input
            type="text"
            value={settingsName}
            onChange={(event) => onSettingsNameChange(event.target.value)}
            placeholder="Project name"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={!canEditSelectedProject}
          />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
              <textarea
            value={settingsDescription}
            onChange={(event) => onSettingsDescriptionChange(event.target.value)}
            placeholder="Project description"
                rows={6}
                className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={!canEditSelectedProject}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Customer</span>
              <input
            type="text"
            value={settingsCustomerName}
            onChange={(event) => onSettingsCustomerNameChange(event.target.value)}
            placeholder="Customer name"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={!canEditSelectedProject}
              />
            </label>
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-900">Schedule</h3>
              <p className="mt-1 text-sm text-slate-500">Set the planned project window.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Start date</span>
            <input
              type="date"
              value={settingsStartDate}
              onChange={(event) => onSettingsStartDateChange(event.target.value)}
              max={settingsDeadline || undefined}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              disabled={!canEditSelectedProject}
            />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">End date</span>
            <input
              type="date"
              value={settingsDeadline}
              onChange={(event) => onSettingsDeadlineChange(event.target.value)}
              min={settingsStartDate || undefined}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              disabled={!canEditSelectedProject}
            />
              </label>
            </div>

            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Duration:{' '}
          {durationDays !== null
            ? `${durationDays} day${durationDays === 1 ? '' : 's'}`
            : 'Set valid start and end dates to calculate'}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-base font-semibold text-slate-900">Client intake</h3>
            <p className="mt-1 text-sm text-slate-500">Share this link so clients can submit requests directly to the project.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={clientIntakeUrl ?? 'Generating link...'}
              readOnly
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            />
            <button
              type="button"
              onClick={() => void handleCopyClientIntakeUrl()}
              disabled={!clientIntakeUrl}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Copy
            </button>
            </div>
          </section>
        </div>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Project actions</h3>
          <p className="mt-1 text-xs text-slate-500">Save changes or manage the project lifecycle.</p>
        </div>
        <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenSaveSettingsConfirm}
          disabled={!canEditSelectedProject || isLoading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save settings
        </button>
        {onOpenCompleteConfirm ? (
          <button
            type="button"
            onClick={onOpenCompleteConfirm}
            disabled={isLoading || !canCompleteSelectedProject || (incompleteTaskCount ?? 0) > 0 || isProjectCompleted}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Complete project
          </button>
        ) : null}
        {onOpenDeleteConfirm ? (
          <button
            type="button"
            onClick={onOpenDeleteConfirm}
            disabled={!canDeleteSelectedProject || isLoading}
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete project
          </button>
        ) : null}
        </div>
      </section>
    </div>
  )
}
