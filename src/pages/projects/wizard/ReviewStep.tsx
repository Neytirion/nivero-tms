import type { ProjectWizardData } from './types'

interface ReviewStepProps {
  data: ProjectWizardData
}

function parseIsoDateToUtcTime(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return Date.UTC(year, month - 1, day)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z')
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getDurationDays(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null
  const startTime = parseIsoDateToUtcTime(startDate)
  const endTime = parseIsoDateToUtcTime(endDate)
  if (startTime === null || endTime === null || endTime < startTime) return null
  const dayInMs = 24 * 60 * 60 * 1000
  return Math.floor((endTime - startTime) / dayInMs) + 1
}

export function ReviewStep({ data }: ReviewStepProps) {
  const durationDays = getDurationDays(data.projectStartDate, data.projectEndDate)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Review Your Project</h2>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <h3 className="font-semibold text-slate-900 mb-3">📋 Project Name & Company</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-slate-600">Name:</span>{' '}
              <span className="font-medium text-slate-900">{data.projectName}</span>
            </p>
            {data.companyName && (
              <p>
                <span className="text-slate-600">Company:</span>{' '}
                <span className="font-medium text-slate-900">{data.companyName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <h3 className="font-semibold text-slate-900 mb-3">📅 Timeline</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-slate-600">Start:</span>{' '}
              <span className="font-medium text-slate-900">{formatDate(data.projectStartDate)}</span>
            </p>
            <p>
              <span className="text-slate-600">End:</span>{' '}
              <span className="font-medium text-slate-900">{formatDate(data.projectEndDate)}</span>
            </p>
            {durationDays !== null && (
              <p>
                <span className="text-slate-600">Duration:</span>{' '}
                <span className="font-medium text-slate-900">{durationDays} days</span>
              </p>
            )}
          </div>
        </div>

        {/* Optional Details */}
        {(data.projectDescription || data.projectBudgetAmount) && (
          <div className="p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold text-slate-900 mb-3">📝 Details</h3>
            <div className="space-y-2 text-sm">
              {data.projectDescription && (
                <p>
                  <span className="text-slate-600">Description:</span>
                  <br />
                  <span className="font-medium text-slate-900">{data.projectDescription}</span>
                </p>
              )}
              {data.projectBudgetAmount && (
                <p>
                  <span className="text-slate-600">Budget:</span>{' '}
                  <span className="font-medium text-slate-900">${Number(data.projectBudgetAmount).toLocaleString()}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Optional Estimates */}
        {data.useEstimates && (
          <div className="p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold text-slate-900 mb-3">⏱️ Estimates</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-600">Status:</span>{' '}
                <span className="font-medium text-slate-900">✓ Enabled</span>
              </p>
              {data.workPackages.length > 0 && (
                <>
                  <p className="text-slate-600 font-medium mt-3">Work Packages:</p>
                  <div className="space-y-1">
                    {data.workPackages.map((pkg, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-900">{pkg.name}</span>
                        <span className="text-slate-600">{pkg.estimatedHours}h</span>
                      </div>
                    ))}
                  </div>
                  <p className="pt-2 border-t border-slate-300 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span className="text-slate-900">
                      {data.workPackages.reduce((sum, pkg) => sum + (Number.parseFloat(pkg.estimatedHours) || 0), 0).toFixed(1)}h
                    </span>
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Optional Team */}
        {data.teamInvitations.length > 0 && (
          <div className="p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold text-slate-900 mb-3">👥 Team Invitations</h3>
            <div className="space-y-2">
              {data.teamInvitations.map((invitation) => (
                <div key={invitation.email} className="flex items-center justify-between text-sm">
                  <span className="text-slate-900">{invitation.email}</span>
                  <span className="text-slate-600 capitalize text-xs bg-slate-200 px-2 py-1 rounded">
                    {invitation.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            ✓ Everything looks good! Click "Create Project" to proceed.
          </p>
        </div>
      </div>
    </div>
  )
}
