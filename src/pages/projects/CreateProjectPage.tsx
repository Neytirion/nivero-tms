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
    projectBudgetAmount,
    setProjectBudgetAmount,
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
        budgetAmount:
          projectBudgetAmount.trim().length > 0 && Number.isFinite(Number(projectBudgetAmount))
            ? Number(projectBudgetAmount)
            : undefined,
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
              📋 Manual Entry
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-75 ${
                mode === 'ai'
                  ? 'border-purple-600 text-purple-600 bg-purple-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              ✨ AI Generator
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Manual mode */}
            {mode === 'manual' && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-4 text-sm font-semibold text-slate-900">Required Information</h3>
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
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-colors"
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
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-colors"
                      />
                      <datalist id="project-customer-suggestions">
                        {customerSuggestions.map((customerName) => (
                          <option key={customerName} value={customerName} />
                        ))}
                      </datalist>
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
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-colors"
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
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-colors"
                      />
                    </label>
                  </div>

                  {durationDays !== null && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900">
                        <span className="font-medium">Duration:</span> {durationDays} day{durationDays === 1 ? '' : 's'}
                      </p>
                    </div>
                  )}

                  {dateRangeError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 font-medium">{dateRangeError}</p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-4 text-sm font-semibold text-slate-900">Additional Details (Optional)</h3>
                  <div className="space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Description
                      </span>
                      <textarea
                        value={projectDescription}
                        onChange={(event) => setProjectDescription(event.target.value)}
                        placeholder="What is this project about? What are the main goals and objectives?"
                        rows={4}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-colors resize-none"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Budget Amount
                      </span>
                      <div className="relative">
                        <span className="absolute left-4 top-2.5 text-sm font-medium text-slate-500">$</span>
                        <input
                          type="number"
                          min={0}
                          step="100"
                          value={projectBudgetAmount}
                          onChange={(event) => setProjectBudgetAmount(event.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-slate-300 pl-8 pr-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-colors"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">💡 Tip:</span> You can add more details like tasks and work packages after creating the project.
                  </p>
                </div>
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
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-75 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading && (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                )}
                {isLoading ? 'Creating...' : 'Create Project'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
