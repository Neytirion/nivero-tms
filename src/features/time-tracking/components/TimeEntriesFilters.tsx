import { Calendar, Filter, Briefcase, RotateCcw } from 'lucide-react'
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
    <section className="rounded-xl border border-slate-200 bg-[linear-gradient(135deg,rgba(6,182,212,0.04),rgba(16,185,129,0.04))] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#06b6d4,#10b981)] shadow-md">
            <Filter size={20} className="text-white" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Filters</h3>
        </div>
        <button
          onClick={onReset}
          className="group flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
        >
          <RotateCcw size={14} className="transition-transform group-hover:rotate-180" />
          Reset all
        </button>
      </div>

      {/* Date Range + Type */}
      <div className="grid gap-4 md:grid-cols-2 items-end mb-5 pb-5 border-b border-slate-200">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Calendar size={16} className="text-cyan-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date Range</span>
          </div>
          <DateRangePicker
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onDateChange={(from, to) => {
              onFilterChange('dateFrom', from)
              onFilterChange('dateTo', to)
            }}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500"></div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Entry Type</span>
          </div>
          <div className="flex gap-2">
            {(['all', 'billable', 'non-billable'] as const).map((option) => (
              <button
                key={option}
                onClick={() => onFilterChange('billableFilter', option)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  filters.billableFilter === option
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md hover:shadow-lg'
                    : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                {option === 'all' ? 'All' : option === 'billable' ? '💰 Billable' : '🔧 Non-billable'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Projects */}
      {projects.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-3 transition-all hover:border-slate-300 hover:shadow-sm">
          <div className="mb-2.5 flex items-center gap-2">
            <Briefcase size={16} className="text-violet-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Projects</span>
          </div>
          <SearchableMultiSelect
            label="Projects"
            items={projects}
            selectedIds={filters.selectedProjectIds}
            onSelectionChange={(selected) => onFilterChange('selectedProjectIds', selected)}
            placeholder="Search projects..."
          />
        </div>
      )}
    </section>
  )
}
