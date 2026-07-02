import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AiProjectGeneratorModal } from '../../features/projects/ai'
import { useProjectForm } from '../../features/projects/hooks/useProjectForm'
import { useWorkspace } from '../../features/dashboard/workspace-context'
import type { AiProjectDraft } from '../../lib/ai'

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

export function CreateProjectPage() {
  const navigate = useNavigate()
  const { addProject, setStatus, projects } = useWorkspace()
  const [mode, setMode] = useState<'manual' | 'ai'>('manual')
  const [isLoading, setIsLoading] = useState(false)

  const {
    projectName,
    setProjectName,
    projectDescription,
    setProjectDescription,
    projectCustomer,
    setProjectCustomer,
    projectStartDate,
    setProjectStartDate,
    projectEndDate,
    setProjectEndDate,
    dateRangeError,
    canSubmit,
    reset,
  } = useProjectForm()

  const customerSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          projects
            .map((project) => project.customer_name?.trim())
            .filter((customerName): customerName is string => Boolean(customerName)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [projects],
  )

  const durationDays = useMemo(
    () => getDurationDays(projectStartDate, projectEndDate),
    [projectStartDate, projectEndDate],
  )

  const handleClose = () => {
    reset()
    navigate('/app/projects')
  }

  const handleCreateProject = async () => {
    if (!canSubmit) {
      return
    }

    setIsLoading(true)
    try {
      await addProject({
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
        customerName: projectCustomer.trim() || undefined,
        startDate: projectStartDate || undefined,
        endDate: projectEndDate || undefined,
      })
      reset()
      navigate('/app/projects')
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Project creation error: ${error.message}`
          : 'Project creation error',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateFromAiDraft = async (draft: AiProjectDraft) => {
    setIsLoading(true)
    try {
      await addProject({
        name: draft.project.name,
        description: draft.project.description || undefined,
        customerName: draft.project.customer_name || undefined,
        startDate: draft.project.start_date || undefined,
        endDate: draft.project.end_date || undefined,
      })
      reset()
      navigate('/app/projects')
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Project creation error: ${error.message}`
          : 'Project creation error',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Create Project</h1>
          <p className="mt-2 text-slate-600">Choose how to create your new project</p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Tab buttons */}
          <div className="flex gap-0 border-b border-slate-200">
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-75 ${
                mode === 'manual'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-75 ${
                mode === 'ai'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              AI Generator
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Manual mode */}
            {mode === 'manual' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Project Name <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(event) => setProjectName(event.target.value)}
                      placeholder="Website Redesign"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Customer
                    </span>
                    <input
                      type="text"
                      list="project-customer-suggestions"
                      value={projectCustomer}
                      onChange={(event) => setProjectCustomer(event.target.value)}
                      placeholder="ABC Ltd"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <datalist id="project-customer-suggestions">
                      {customerSuggestions.map((customerName) => (
                        <option key={customerName} value={customerName} />
                      ))}
                    </datalist>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Description
                    </span>
                    <textarea
                      value={projectDescription}
                      onChange={(event) => setProjectDescription(event.target.value)}
                      placeholder="Optional: project goals, scope, key constraints..."
                      rows={4}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Start Date <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="date"
                      value={projectStartDate}
                      onChange={(event) => setProjectStartDate(event.target.value)}
                      required
                      max={projectEndDate || undefined}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      End Date <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="date"
                      value={projectEndDate}
                      onChange={(event) => setProjectEndDate(event.target.value)}
                      required
                      min={projectStartDate || undefined}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </label>
                </div>

                <p className="text-sm text-slate-600">
                  Duration:{' '}
                  {durationDays !== null
                    ? `${durationDays} day${durationDays === 1 ? '' : 's'}`
                    : 'Set valid start and end dates to calculate'}
                </p>

                {dateRangeError ? (
                  <p className="text-sm text-rose-600">{dateRangeError}</p>
                ) : null}
              </div>
            )}

            {/* AI mode info */}
            {mode === 'ai' && (
              <AiProjectGeneratorModal
                isOpen
                variant="inline"
                onClose={() => setMode('manual')}
                onConfirm={handleCreateFromAiDraft}
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 rounded-b-2xl">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-75 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              Cancel
            </button>
            {mode === 'manual' ? (
              <button
                type="button"
                onClick={() => void handleCreateProject()}
                disabled={isLoading || !canSubmit}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-75 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Creating...' : 'Create Project'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
