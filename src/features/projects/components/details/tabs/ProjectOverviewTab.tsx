import { useEffect, useState } from 'react'
import { getProjectMemberDisplayRoles, type ProjectMemberListItem, type ProjectPreview, type TaskPreview, type EstimateWithPackages } from '../../../../../lib/pm'
import { UserProfileDialog, type UserProfilePreview } from '../../../../../shared/components'
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

function getEstimateBudget(estimates: EstimateWithPackages[]): { budget: number; pricePerHour: number | null; estimatedHours: number } | null {
  if (estimates.length === 0) {
    return null
  }

  // Get the latest estimate (first in sorted array - by version_number desc)
  const latestEstimate = estimates[0]
  
  if (!latestEstimate || !latestEstimate.price_per_hour) {
    return null
  }

  const totalHours = latestEstimate.work_packages.reduce((sum, pkg) => sum + (pkg.estimated_hours ?? 0), 0)
  
  return {
    budget: latestEstimate.price_per_hour * totalHours,
    pricePerHour: latestEstimate.price_per_hour,
    estimatedHours: totalHours,
  }
}

interface ProjectOverviewTabProps {
  selectedProject: ProjectPreview
  tasks: TaskPreview[]
  projectManagerName?: string
  teamMemberNames: string[]
  projectMembers: ProjectMemberListItem[]
  currentUserProfile: UserProfilePreview | null
  estimates?: EstimateWithPackages[]
}

export function ProjectOverviewTab({
  selectedProject,
  tasks,
  projectManagerName,
  teamMemberNames,
  projectMembers,
  currentUserProfile,
  estimates,
}: ProjectOverviewTabProps) {
  const [exportFormat, setExportFormat] = useState<ClientBriefExportFormat>('pdf')
  const [isExporting, setIsExporting] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<UserProfilePreview | null>(null)
  const [memberDisplayRoleByUserId, setMemberDisplayRoleByUserId] = useState<Record<string, string>>({})
  const durationDays = getDurationDays(selectedProject.start_date, selectedProject.end_date)

  useEffect(() => {
    let isMounted = true

    const loadDisplayRoles = async () => {
      try {
        const assignments = await getProjectMemberDisplayRoles(selectedProject.id)
        if (!isMounted) {
          return
        }

        setMemberDisplayRoleByUserId(
          assignments.reduce<Record<string, string>>((acc, item) => {
            acc[item.user_id] = item.display_role
            return acc
          }, {}),
        )
      } catch (error) {
        console.error('Failed to load display roles for overview:', error)
        if (isMounted) {
          setMemberDisplayRoleByUserId({})
        }
      }
    }

    void loadDisplayRoles()

    return () => {
      isMounted = false
    }
  }, [selectedProject.id])

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
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {selectedProject.estimated_hours != null ? selectedProject.estimated_hours.toFixed(0) : '—'}
            {selectedProject.estimated_hours != null ? <span className="ml-1 text-lg text-slate-400">h</span> : null}
          </p>
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

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Description</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
          {selectedProject.description?.trim() || 'No project description yet.'}
        </p>
      </section>

      {/* Project info + team */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Project Info</p>
          <dl className="mt-3 space-y-2">
            {(() => {
              const budgetData = estimates ? getEstimateBudget(estimates) : null
              const budgetValue = !estimates
                ? '—'
                : budgetData
                  ? `${budgetData.budget.toFixed(0)}kr (${budgetData.pricePerHour}kr/h)`
                  : '—'

              return [
                { label: 'Customer', value: selectedProject.customer_name ?? 'Not set' },
                { label: 'Manager', value: projectManagerName ?? (selectedProject.project_manager_id ? 'Assigned' : 'Not set') },
                { label: 'Budget', value: budgetValue },
                { label: 'Created', value: formatDate(selectedProject.created_at) },
              ]
            })().map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                <dt className="shrink-0 text-xs text-slate-500">{label}</dt>
                <dd className="truncate text-sm font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Team</p>
          {projectMembers.length === 0 && teamMemberNames.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No members yet</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {(projectMembers.length > 0
                ? projectMembers.map((member) => ({
                  key: member.member_id,
                  name: member.full_name ?? member.email ?? member.user_id,
                  role: member.user_id ? (memberDisplayRoleByUserId[member.user_id] ?? null) : null,
                  profile: {
                      ...(member.user_id && currentUserProfile?.userId === member.user_id ? currentUserProfile : {}),
                      userId: member.user_id,
                      fullName: member.full_name,
                      email: currentUserProfile?.userId === member.user_id ? currentUserProfile.email || member.email : member.email,
                      avatarUrl: currentUserProfile?.userId === member.user_id ? currentUserProfile.avatarUrl || member.avatar_url : member.avatar_url,
                      role: member.role,
                      joinedAt: member.joined_at ?? currentUserProfile?.joinedAt,
                  } satisfies UserProfilePreview,
                }))
                : teamMemberNames.map((name, index) => ({
                  key: `${name}-${index}`,
                  name,
                  role: null,
                  profile: {
                    fullName: name,
                    avatarUrl: null,
                  } satisfies UserProfilePreview,
                }))).map((member) => {
                const initials = member.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <li key={member.key} className="flex items-center gap-2.5">
                    {member.profile.avatarUrl ? (
                      <img
                        src={member.profile.avatarUrl}
                        alt={member.name}
                        className="h-7 w-7 shrink-0 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                        {initials}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedProfile(member.profile)}
                      className="truncate text-left text-sm font-medium text-slate-700 underline-offset-2 hover:text-cyan-700 hover:underline"
                    >
                      {member.name}
                    </button>
                    {member.role ? (
                      <span className="inline-flex h-5 shrink-0 items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2 w-2 rounded-full bg-cyan-500" aria-hidden="true" />
                        <span className="truncate">{member.role}</span>
                      </span>
                    ) : null}
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

      <UserProfileDialog
        isOpen={Boolean(selectedProfile)}
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />
    </div>
  )
}
