import { useState } from 'react'
import type { ProjectPreview, TaskPreview } from '../../../../../lib/pm'
import { downloadClientBrief, type ClientBriefExportFormat } from '../../../utils/client-brief'
import { deriveProgress, deriveRisk, formatDate } from '../../../utils/project-metrics'

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

function getDurationDays(startDate: string | null, endDate: string | null): number | null {
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

interface ProjectOverviewTabProps {
  selectedProject: ProjectPreview
  tasks: TaskPreview[]
  projectManagerName?: string
  teamMemberNames: string[]
}

export function ProjectOverviewTab({
  selectedProject,
  tasks,
  projectManagerName,
  teamMemberNames,
}: ProjectOverviewTabProps) {
  const [exportFormat, setExportFormat] = useState<ClientBriefExportFormat>('pdf')
  const [isExporting, setIsExporting] = useState(false)
  const durationDays = getDurationDays(selectedProject.start_date, selectedProject.end_date)

  const exportClientBrief = async () => {
    setIsExporting(true)

    try {
      await downloadClientBrief({
        project: selectedProject,
        tasks,
        teamMemberNames,
        projectManagerName,
      }, exportFormat)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="mt-4 grid gap-4">
      {/* Hero stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Progress</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{deriveProgress(selectedProject)}<span className="text-lg text-slate-400">%</span></p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${deriveProgress(selectedProject)}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Estimated</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{(selectedProject.estimated_hours ?? 0).toFixed(0)}<span className="ml-1 text-lg text-slate-400">h</span></p>
          <p className="mt-2 text-xs text-slate-500">Actual: {(selectedProject.actual_hours ?? 0).toFixed(1)}h</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Duration</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {durationDays !== null ? durationDays : '—'}
            {durationDays !== null && <span className="ml-1 text-lg text-slate-400">d</span>}
          </p>
          <p className="mt-2 text-xs text-slate-500">{formatDate(selectedProject.start_date)} → {formatDate(selectedProject.end_date)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Risk</p>
          <p className={`mt-1 text-2xl font-bold capitalize ${
            deriveRisk(selectedProject) === 'Red' ? 'text-rose-600' :
            deriveRisk(selectedProject) === 'Amber' ? 'text-amber-500' : 'text-emerald-600'
          }`}>{deriveRisk(selectedProject)}</p>
          <p className="mt-2 text-xs text-slate-500">{selectedProject.status ?? 'active'}</p>
        </div>
      </div>

      {/* Project info + team */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Project Info</p>
          <dl className="mt-3 space-y-2">
            {[
              { label: 'Customer', value: selectedProject.customer_name ?? 'Not set' },
              { label: 'Manager', value: projectManagerName ?? (selectedProject.project_manager_id ? 'Assigned' : 'Not set') },
              { label: 'Created', value: formatDate(selectedProject.created_at) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                <dt className="shrink-0 text-xs text-slate-500">{label}</dt>
                <dd className="truncate text-sm font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          {selectedProject.description && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{selectedProject.description}</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Team</p>
          {teamMemberNames.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No members yet</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {teamMemberNames.map((name) => {
                const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <li key={name} className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                      {initials}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{name}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Export */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="mr-auto text-xs text-slate-500">Export client brief</p>
        <select
          value={exportFormat}
          onChange={(event) => setExportFormat(event.target.value as ClientBriefExportFormat)}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 outline-none focus:border-slate-500"
          aria-label="Select export format"
        >
          <option value="pdf">PDF</option>
          <option value="html">HTML</option>
          <option value="docx">DOCX</option>
        </select>
        <button
          type="button"
          onClick={() => void exportClientBrief()}
          disabled={isExporting}
          className="rounded-md border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-900 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
        </button>
      </div>
    </div>
  )
}
