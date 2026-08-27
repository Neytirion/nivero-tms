import type { ReportsFilterState } from '../types/reports'
import { DateRangePicker } from './DateRangePicker'

interface ReportsFiltersProps {
  filters: ReportsFilterState
  isLoading: boolean
  projects: Array<{ id: string; name: string; customer_name: string | null }>
  uniqueMembers: Array<{ id: string; name: string }>
  uniqueClients: string[]
  onFilterChange: (key: keyof ReportsFilterState, value: unknown) => void
  onReset: () => void
}

export function ReportsFilters({
  filters,
  isLoading,
  projects,
  uniqueMembers,
  uniqueClients,
  onFilterChange,
  onReset,
}: ReportsFiltersProps) {
  const handleMemberToggle = (memberId: string) => {
    const updated = filters.selectedMemberIds.includes(memberId)
      ? filters.selectedMemberIds.filter((id) => id !== memberId)
      : [...filters.selectedMemberIds, memberId]
    onFilterChange('selectedMemberIds', updated)
  }

  const handleProjectToggle = (projectId: string) => {
    const updated = filters.selectedProjectIds.includes(projectId)
      ? filters.selectedProjectIds.filter((id) => id !== projectId)
      : [...filters.selectedProjectIds, projectId]
    onFilterChange('selectedProjectIds', updated)
  }

  const handleClientToggle = (clientName: string) => {
    const updated = filters.selectedClientNames.includes(clientName)
      ? filters.selectedClientNames.filter((name) => name !== clientName)
      : [...filters.selectedClientNames, clientName]
    onFilterChange('selectedClientNames', updated)
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
        <button
          onClick={onReset}
          className="text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          Reset all
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5 items-end">
        {/* Date Range Picker */}
        <div>
          <DateRangePicker
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onDateChange={(from, to) => {
              onFilterChange('dateFrom', from)
              onFilterChange('dateTo', to)
            }}
          />
        </div>

        {/* Billable Filter */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Type</span>
          <div className="flex gap-2">
            {(['all', 'billable', 'non-billable'] as const).map((option) => (
              <button
                key={option}
                onClick={() => onFilterChange('billableFilter', option)}
                disabled={isLoading}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filters.billableFilter === option
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 disabled:bg-slate-100'
                }`}
              >
                {option === 'all' ? 'All' : option === 'billable' ? 'Billable' : 'Non-billable'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-select filters */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {/* Members */}
        {uniqueMembers.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Members</p>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
              {uniqueMembers.map((member) => (
                <label key={member.id} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    checked={filters.selectedMemberIds.includes(member.id)}
                    onChange={() => handleMemberToggle(member.id)}
                    disabled={isLoading}
                    className="h-4 w-4 rounded border-slate-300 text-slate-600"
                  />
                  <span className="text-sm text-slate-700">{member.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Projects</p>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
              {projects.map((project) => (
                <label key={project.id} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    checked={filters.selectedProjectIds.includes(project.id)}
                    onChange={() => handleProjectToggle(project.id)}
                    disabled={isLoading}
                    className="h-4 w-4 rounded border-slate-300 text-slate-600"
                  />
                  <span className="text-sm text-slate-700">{project.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Clients */}
        {uniqueClients.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Clients</p>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
              {uniqueClients.map((clientName) => (
                <label key={clientName} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    checked={filters.selectedClientNames.includes(clientName)}
                    onChange={() => handleClientToggle(clientName)}
                    disabled={isLoading}
                    className="h-4 w-4 rounded border-slate-300 text-slate-600"
                  />
                  <span className="text-sm text-slate-700">{clientName}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
