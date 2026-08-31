import type { ProjectPreview } from '../../../lib/pm'
import { SearchableMultiSelect } from '../../../shared/components'
import { DateRangePicker } from '../../../features/reports/components/DateRangePicker'
import type { TimeEntriesFilterState } from '../hooks/useTimeEntriesManagement'

interface TimeEntriesFiltersProps {
  filters: TimeEntriesFilterState
  projects: ProjectPreview[]
  onFilterChange: (key: keyof TimeEntriesFilterState, value: unknown) => void
  onReset: () => void
}

export function TimeEntriesFilters({
  filters,
  projects,
  onFilterChange,
  onReset,
}: TimeEntriesFiltersProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
        <button
          onClick={onReset}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          Reset all
        </button>
      </div>

      {/* Row 1: Date Range + Type */}
      <div className="grid gap-4 md:grid-cols-2 items-end mb-4">
        {/* Date Range */}
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
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filters.billableFilter === option
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                {option === 'all' ? 'All' : option === 'billable' ? 'Billable' : 'Non-billable'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Projects */}
      <div className="grid gap-4">
        {/* Projects */}
        {projects.length > 0 && (
          <SearchableMultiSelect
            label="Projects"
            items={projects}
            selectedIds={filters.selectedProjectIds}
            onSelectionChange={(selected) => onFilterChange('selectedProjectIds', selected)}
            placeholder="Search projects..."
          />
        )}
      </div>
    </section>
  )
}
