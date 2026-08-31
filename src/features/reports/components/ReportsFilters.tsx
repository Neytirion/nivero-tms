import type { ReportsFilterState } from '../types/reports'
import { DateRangePicker } from './DateRangePicker'
import { SearchableMultiSelect, SearchableClientSelect } from '../../../shared/components'

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
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

        {/* Members */}
        {uniqueMembers.length > 0 && (
          <SearchableMultiSelect
            label="Members"
            items={uniqueMembers}
            selectedIds={filters.selectedMemberIds}
            onSelectionChange={(selected) => onFilterChange('selectedMemberIds', selected)}
            disabled={isLoading}
            placeholder="Search members..."
          />
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <SearchableMultiSelect
            label="Projects"
            items={projects}
            selectedIds={filters.selectedProjectIds}
            onSelectionChange={(selected) => onFilterChange('selectedProjectIds', selected)}
            disabled={isLoading}
            placeholder="Search projects..."
          />
        )}

        {/* Clients */}
        {uniqueClients.length > 0 && (
          <SearchableClientSelect
            label="Clients"
            clients={uniqueClients}
            selectedClients={filters.selectedClientNames}
            onSelectionChange={(selected) => onFilterChange('selectedClientNames', selected)}
            disabled={isLoading}
            placeholder="Search clients..."
          />
        )}
      </div>
    </section>
  )
}
