interface CreateProjectModalProps {
  isOpen: boolean
  projectName: string
  projectCustomer: string
  projectStartDate: string
  projectEndDate: string
  isLoading: boolean
  canSubmit: boolean
  onProjectNameChange: (value: string) => void
  onProjectCustomerChange: (value: string) => void
  onProjectStartDateChange: (value: string) => void
  onProjectEndDateChange: (value: string) => void
  onCreate: () => void | Promise<void>
  onClose: () => void
}

export function CreateProjectModal({
  isOpen,
  projectName,
  projectCustomer,
  projectStartDate,
  projectEndDate,
  isLoading,
  canSubmit,
  onProjectNameChange,
  onProjectCustomerChange,
  onProjectStartDateChange,
  onProjectEndDateChange,
  onCreate,
  onClose,
}: CreateProjectModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close create project modal"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
      />

      <section className="relative z-10 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-900">Create Project</h2>
        <p className="mt-1 text-sm text-slate-500">Fill in project details for kickoff.</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Name</span>
            <input
              type="text"
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              placeholder="Website Redesign"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</span>
            <input
              type="text"
              value={projectCustomer}
              onChange={(event) => onProjectCustomerChange(event.target.value)}
              placeholder="ABC Ltd"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Start Date</span>
            <input
              type="date"
              value={projectStartDate}
              onChange={(event) => onProjectStartDateChange(event.target.value)}
              aria-label="Start Date"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">End Date</span>
            <input
              type="date"
              value={projectEndDate}
              onChange={(event) => onProjectEndDateChange(event.target.value)}
              aria-label="End Date"
              required
              min={projectStartDate || undefined}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onCreate()}
            disabled={isLoading || !canSubmit}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create project
          </button>
        </div>
      </section>
    </div>
  )
}
