import { useEffect, useState } from 'react'
import { Info, X } from 'lucide-react'
import { getProjectMemberDisplayRoles, type ProjectMemberListItem, type ProjectPreview, type TaskPreview, type EstimateWithPackages } from '../../../../../lib/pm'
import { UserProfileDialog, type UserProfilePreview } from '../../../../../shared/components'
import { downloadClientBrief, type ClientBriefExportFormat } from '../../../utils/client-brief'
import { deriveProjectHealth, formatDate } from '../../../utils/project-metrics'

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
  const approvedEstimate = estimates.find((estimate) => estimate.status === 'approved')
  
  if (!approvedEstimate?.price_per_hour) {
    return null
  }

  const totalHours = approvedEstimate.work_packages.reduce(
    (sum, pkg) => sum + (pkg.is_active ? (pkg.estimated_hours ?? 0) : 0),
    0,
  )
  
  return {
    budget: approvedEstimate.price_per_hour * totalHours,
    pricePerHour: approvedEstimate.price_per_hour,
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

interface HealthMetricExplanation {
  title: string
  description: string
  formula: string
  interpretation: string
}

function HealthMetricButton({
  label,
  value,
  detail,
  valueClassName = 'text-slate-900',
  onClick,
}: {
  label: string
  value: string
  detail?: string
  valueClassName?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Explain ${label}`}
      aria-haspopup="dialog"
      className="group min-w-0 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
    >
      <span className="flex items-center gap-1 text-xs text-slate-500">
        {label}
        <Info aria-hidden="true" className="h-3.5 w-3.5 text-slate-400 group-hover:text-cyan-700" />
      </span>
      <span className={`mt-1 block text-lg font-semibold ${valueClassName}`}>{value}</span>
      {detail ? <span className="mt-1 block text-xs text-slate-500">{detail}</span> : null}
    </button>
  )
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
  const [selectedHealthMetric, setSelectedHealthMetric] = useState<HealthMetricExplanation | null>(null)
  const [memberDisplayRoleByUserId, setMemberDisplayRoleByUserId] = useState<Record<string, string>>({})
  const durationDays = getDurationDays(selectedProject.start_date, selectedProject.end_date)
  const health = deriveProjectHealth(selectedProject)
  const forecastHours = health.baselineHours != null && health.forecastAtCompletionPercent != null
    ? health.baselineHours * health.forecastAtCompletionPercent / 100
    : null
  const riskClassName =
    health.risk === 'Red'
      ? 'text-rose-600'
      : health.risk === 'Amber'
        ? 'text-amber-500'
        : health.risk === 'Unknown'
          ? 'text-slate-500'
          : 'text-emerald-600'

  const healthMetricExplanations = {
    progress: {
      title: 'Progress',
      description: 'The share of project scope completed so far.',
      formula: selectedProject.use_estimates
        ? 'Completed task estimate hours / Approved estimated hours × 100'
        : 'Completed tasks / Total tasks × 100',
      interpretation: `${health.progressPercent.toFixed(1)}% of the project scope is complete.`,
    },
    duration: {
      title: 'Duration',
      description: 'The inclusive calendar duration between the project start and end dates.',
      formula: 'End date − Start date + 1 day',
      interpretation: durationDays == null
        ? 'Set valid project start and end dates to calculate duration.'
        : `The planned project duration is ${durationDays} day${durationDays === 1 ? '' : 's'}.`,
    },
    estimated: {
      title: 'Estimated',
      description: 'The total planned effort in the approved estimate. Draft estimate changes do not affect this value.',
      formula: 'Sum of estimated hours in active work packages',
      interpretation: health.baselineHours == null
        ? 'This project does not have approved estimated hours yet.'
        : `The approved scope contains ${health.baselineHours.toFixed(1)} planned hours.`,
    },
    actual: {
      title: 'Actual',
      description: 'The total time recorded against this project so far.',
      formula: 'Sum of project time entries',
      interpretation: `${(selectedProject.actual_hours ?? 0).toFixed(1)} hours have been recorded.`,
    },
    hoursUsed: {
      title: 'Hours used',
      description: 'The share of baseline hours already recorded through project time entries.',
      formula: 'Actual hours / Baseline hours × 100',
      interpretation: health.hoursConsumedPercent == null
        ? 'This value requires baseline hours.'
        : `${health.hoursConsumedPercent.toFixed(1)}% of the approved hours have been used.`,
    },
    variance: {
      title: 'Hours variance',
      description: 'Shows whether hours are being consumed faster or slower than project scope is being completed.',
      formula: 'Hours used − Progress',
      interpretation: health.hoursVariancePercent == null
        ? 'This value requires baseline hours.'
        : health.hoursVariancePercent > 0
          ? `Hours consumption is ${health.hoursVariancePercent.toFixed(1)} percentage points ahead of delivery.`
          : health.hoursVariancePercent < 0
            ? `Delivery is ${Math.abs(health.hoursVariancePercent).toFixed(1)} percentage points ahead of hours consumption.`
            : 'Delivery progress and hours consumption are aligned.',
    },
    expectedProgress: {
      title: 'Expected progress',
      description: 'The progress expected today if work is distributed evenly across project working days.',
      formula: 'Elapsed working days / Total working days × 100',
      interpretation: health.expectedProgressPercent == null
        ? 'Set project start and end dates to calculate expected progress.'
        : `Based on the schedule, the project should be ${health.expectedProgressPercent.toFixed(1)}% complete today.`,
    },
    forecast: {
      title: 'Forecast at completion',
      description: 'Predicts total baseline-hour consumption if the current delivery efficiency continues.',
      formula: 'Hours used / Progress × 100',
      interpretation: health.forecastAtCompletionPercent == null
        ? 'The forecast appears after the project reaches 10% progress.'
        : health.forecastAtCompletionPercent > 100
          ? `The project is forecast to use ${health.forecastAtCompletionPercent.toFixed(1)}% of estimated hours${forecastHours == null ? '.' : `, or ${forecastHours.toFixed(1)} hours.`}`
          : `The project is forecast to finish within ${health.forecastAtCompletionPercent.toFixed(1)}% of estimated hours${forecastHours == null ? '.' : `, or ${forecastHours.toFixed(1)} hours.`}`,
    },
    risk: {
      title: 'Risk status',
      description: 'The worst current signal across hours variance, schedule variance, forecast, overdue work, and unresolved blockers.',
      formula: 'Worst applicable signal: Unknown, Green, Amber, or Red',
      interpretation: health.riskReason ?? 'No risk explanation is available.',
    },
  } satisfies Record<string, HealthMetricExplanation>

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

  useEffect(() => {
    if (!selectedHealthMetric) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedHealthMetric(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedHealthMetric])

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
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Delivery health</h3>
            <p className="mt-1 text-xs text-slate-500">Delivery progress compared with approved estimated hours</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedHealthMetric(healthMetricExplanations.risk)}
            aria-label="Explain Risk status"
            aria-haspopup="dialog"
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 ${riskClassName}`}
          >
            {health.risk}
            <Info aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-[1fr_1.3fr_0.8fr] lg:gap-0">
          <div className="min-w-0 lg:pr-4">
            <h4 className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Schedule</h4>
            <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-2">
              <HealthMetricButton
                label="Progress"
                value={`${health.progressPercent.toFixed(1)}%`}
                onClick={() => setSelectedHealthMetric(healthMetricExplanations.progress)}
              />
              <HealthMetricButton
                label="Duration"
                value={durationDays == null ? '—' : `${durationDays}d`}
                detail={`${formatDate(selectedProject.start_date)} → ${formatDate(selectedProject.end_date)}`}
                onClick={() => setSelectedHealthMetric(healthMetricExplanations.duration)}
              />
              <HealthMetricButton
                label="Expected progress"
                value={health.expectedProgressPercent == null ? '—' : `${health.expectedProgressPercent.toFixed(1)}%`}
                onClick={() => setSelectedHealthMetric(healthMetricExplanations.expectedProgress)}
              />
            </div>
          </div>

          <div className="min-w-0 border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:px-4 lg:pt-0">
            <h4 className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Effort</h4>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <HealthMetricButton
                label="Estimated"
                value={health.baselineHours == null ? '—' : `${health.baselineHours.toFixed(1)}h`}
                onClick={() => setSelectedHealthMetric(healthMetricExplanations.estimated)}
              />
              <HealthMetricButton
                label="Actual"
                value={`${(selectedProject.actual_hours ?? 0).toFixed(1)}h`}
                onClick={() => setSelectedHealthMetric(healthMetricExplanations.actual)}
              />
              <HealthMetricButton
                label="Hours used"
                value={health.hoursConsumedPercent == null ? '—' : `${health.hoursConsumedPercent.toFixed(1)}%`}
                onClick={() => setSelectedHealthMetric(healthMetricExplanations.hoursUsed)}
              />
              <HealthMetricButton
                label="Hours variance"
                value={health.hoursVariancePercent == null ? '—' : `${health.hoursVariancePercent > 0 ? '+' : ''}${health.hoursVariancePercent.toFixed(1)} pp`}
                valueClassName={(health.hoursVariancePercent ?? 0) > 10 ? riskClassName : 'text-slate-900'}
                onClick={() => setSelectedHealthMetric(healthMetricExplanations.variance)}
              />
            </div>
          </div>

          <div className="min-w-0 border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            <h4 className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Outlook</h4>
            <div className="mt-1">
              <HealthMetricButton
                label="Forecast at completion"
                value={health.forecastAtCompletionPercent == null
                  ? '—'
                  : `${health.forecastAtCompletionPercent.toFixed(1)}%${forecastHours == null ? '' : ` · ${forecastHours.toFixed(1)}h`}`}
                onClick={() => setSelectedHealthMetric(healthMetricExplanations.forecast)}
              />
            </div>
            <p className="mt-2 border-t border-slate-100 px-2 pt-3 text-xs leading-5 text-slate-600">
              {health.riskReason ?? 'No risk explanation is available.'}
            </p>
          </div>
        </div>
      </section>

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
                { label: 'Commercial budget', value: budgetValue },
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

      {selectedHealthMetric ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close metric explanation backdrop"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={() => setSelectedHealthMetric(null)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="health-metric-title"
            className="relative z-10 w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setSelectedHealthMetric(null)}
              aria-label="Close metric explanation"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
            <h3 id="health-metric-title" className="pr-10 text-base font-semibold text-slate-950">
              {selectedHealthMetric.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{selectedHealthMetric.description}</p>
            <div className="mt-4 border-l-2 border-cyan-600 pl-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Formula</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{selectedHealthMetric.formula}</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">{selectedHealthMetric.interpretation}</p>
          </section>
        </div>
      ) : null}
    </div>
  )
}
