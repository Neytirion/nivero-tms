/**
 * AI Project Generator Modal
 * Allows users to generate projects from text descriptions
 */

import { useState } from 'react'
import type { AiProjectDraft } from '../../../lib/ai'
import { useGenerateProject } from './useGenerateProject'

interface AiProjectGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (draft: AiProjectDraft) => Promise<void>
}

export function AiProjectGeneratorModal({ isOpen, onClose, onConfirm }: AiProjectGeneratorModalProps) {
  const [inputText, setInputText] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [draftEdits, setDraftEdits] = useState<AiProjectDraft | null>(null)
  const { isLoading, error, preview, validationErrors, generate, reset } = useGenerateProject()

  const effectiveDraft = draftEdits ?? preview

  const updateProjectField = <K extends keyof AiProjectDraft['project']>(
    key: K,
    value: AiProjectDraft['project'][K]
  ) => {
    if (!effectiveDraft) return

    setDraftEdits((prev) => {
      const base = prev ?? effectiveDraft
      return {
        ...base,
        project: {
          ...base.project,
          [key]: value,
        },
      }
    })
  }

  const updateWorkPackageField = (workPackageIndex: number, key: 'name' | 'estimated_hours', value: string | number) => {
    if (!effectiveDraft) return

    setDraftEdits((prev) => {
      const base = prev ?? effectiveDraft
      return {
        ...base,
        estimates: {
          ...base.estimates,
          work_packages: base.estimates.work_packages.map((workPackage, index) => {
            if (index !== workPackageIndex) return workPackage
            return {
              ...workPackage,
              [key]: value,
            }
          }),
        },
      }
    })
  }

  const updateTaskField = (
    workPackageIndex: number,
    taskIndex: number,
    key: 'title' | 'priority' | 'estimate_hours',
    value: string | number
  ) => {
    if (!effectiveDraft) return

    setDraftEdits((prev) => {
      const base = prev ?? effectiveDraft
      return {
        ...base,
        estimates: {
          ...base.estimates,
          work_packages: base.estimates.work_packages.map((workPackage, wpIndex) => {
            if (wpIndex !== workPackageIndex) return workPackage
            return {
              ...workPackage,
              tasks: workPackage.tasks.map((task, tIndex) => {
                if (tIndex !== taskIndex) return task
                return {
                  ...task,
                  [key]: value,
                }
              }),
            }
          }),
        },
      }
    })
  }

  const hasInvalidDraft =
    !!effectiveDraft &&
    (
      !effectiveDraft.project.name.trim() ||
      effectiveDraft.project.name.trim().length < 3 ||
      effectiveDraft.project.estimated_hours < 0 ||
      effectiveDraft.estimates.work_packages.some((workPackage) =>
        !workPackage.name.trim() ||
        workPackage.estimated_hours < 0 ||
        workPackage.tasks.some((task) => !task.title.trim() || task.estimate_hours < 0)
      )
    )

  if (!isOpen) return null

  const handleGenerate = async () => {
    await generate(inputText)
  }

  const handleConfirm = async () => {
    if (!effectiveDraft || hasInvalidDraft) return

    setIsConfirming(true)
    try {
      await onConfirm(effectiveDraft)
      reset()
      setInputText('')
      setDraftEdits(null)
      onClose()
    } catch (err) {
      console.error('Error confirming project:', err)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleClose = () => {
    reset()
    setInputText('')
    setDraftEdits(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-2xl font-bold">Generate Project with AI</h2>

        {!effectiveDraft ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Describe your project in detail and let AI create the structure for you.
            </p>

            {/* Input textarea */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project Description</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g., Create a mobile app for time tracking. Include user authentication, time entry logging with timer, weekly reports, export to CSV..."
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-300 p-3 text-sm disabled:bg-gray-100"
                rows={6}
              />
            </div>

            {/* Error display */}
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
                {validationErrors && (
                  <ul className="mt-2 list-inside list-disc">
                    {Object.entries(validationErrors).map(([field, errors]) => (
                      <li key={field}>
                        {field}: {errors.join(', ')}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={!inputText.trim() || isLoading}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Generating...' : 'Generate with AI'}
              </button>
              <button
                onClick={handleClose}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Preview section */
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review and Edit Before Creation</h3>

            {/* Project info */}
            <div className="rounded-lg bg-blue-50 p-4">
              <h4 className="mb-3 font-semibold text-blue-900">Project</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-blue-900">
                  Name
                  <input
                    type="text"
                    value={effectiveDraft.project.name}
                    onChange={(event) => updateProjectField('name', event.target.value)}
                    className="mt-1 w-full rounded border border-blue-200 px-2 py-1 text-sm text-slate-900"
                  />
                </label>
                <label className="text-xs text-blue-900">
                  Customer
                  <input
                    type="text"
                    value={effectiveDraft.project.customer_name ?? ''}
                    onChange={(event) => updateProjectField('customer_name', event.target.value || undefined)}
                    className="mt-1 w-full rounded border border-blue-200 px-2 py-1 text-sm text-slate-900"
                  />
                </label>
                <label className="text-xs text-blue-900">
                  Start Date
                  <input
                    type="date"
                    value={effectiveDraft.project.start_date ?? ''}
                    onChange={(event) => updateProjectField('start_date', event.target.value || undefined)}
                    className="mt-1 w-full rounded border border-blue-200 px-2 py-1 text-sm text-slate-900"
                  />
                </label>
                <label className="text-xs text-blue-900">
                  End Date
                  <input
                    type="date"
                    value={effectiveDraft.project.end_date ?? ''}
                    onChange={(event) => updateProjectField('end_date', event.target.value || undefined)}
                    className="mt-1 w-full rounded border border-blue-200 px-2 py-1 text-sm text-slate-900"
                  />
                </label>
                <label className="text-xs text-blue-900">
                  Estimated Hours
                  <input
                    type="number"
                    min={0}
                    value={effectiveDraft.project.estimated_hours}
                    onChange={(event) => updateProjectField('estimated_hours', Number(event.target.value) || 0)}
                    className="mt-1 w-full rounded border border-blue-200 px-2 py-1 text-sm text-slate-900"
                  />
                </label>
                <label className="text-xs text-blue-900">
                  Budget
                  <input
                    type="number"
                    min={0}
                    value={effectiveDraft.project.budget_amount ?? ''}
                    onChange={(event) =>
                      updateProjectField(
                        'budget_amount',
                        event.target.value === '' ? undefined : Number(event.target.value)
                      )
                    }
                    className="mt-1 w-full rounded border border-blue-200 px-2 py-1 text-sm text-slate-900"
                  />
                </label>
              </div>
            </div>

            {/* Work packages and tasks preview */}
            <div className="space-y-3">
              {effectiveDraft.estimates.work_packages.map((pkg, pkgIdx) => (
                <div key={pkgIdx} className="rounded-lg border border-gray-200 p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                    <input
                      type="text"
                      value={pkg.name}
                      onChange={(event) => updateWorkPackageField(pkgIdx, 'name', event.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-sm font-medium text-slate-900"
                    />
                    <input
                      type="number"
                      min={0}
                      value={pkg.estimated_hours}
                      onChange={(event) => updateWorkPackageField(pkgIdx, 'estimated_hours', Number(event.target.value) || 0)}
                      className="w-28 rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700"
                    />
                  </div>
                  <ul className="mt-2 space-y-1">
                    {pkg.tasks.map((task, taskIdx) => (
                      <li key={taskIdx} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                        <input
                          type="text"
                          value={task.title}
                          onChange={(event) => updateTaskField(pkgIdx, taskIdx, 'title', event.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700"
                        />
                        <select
                          value={task.priority}
                          onChange={(event) => updateTaskField(pkgIdx, taskIdx, 'priority', event.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs"
                        >
                          <option value="low">low</option>
                          <option value="medium">medium</option>
                          <option value="high">high</option>
                        </select>
                        <input
                          type="number"
                          min={0}
                          value={task.estimate_hours}
                          onChange={(event) => updateTaskField(pkgIdx, taskIdx, 'estimate_hours', Number(event.target.value) || 0)}
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {hasInvalidDraft && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                Please fill required fields (project name, work package names, task titles) and use non-negative hours.
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                disabled={isConfirming || hasInvalidDraft}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-500 disabled:bg-gray-300"
              >
                {isConfirming ? 'Creating...' : 'Create Project'}
              </button>
              <button
                onClick={() => {
                  reset()
                  setInputText('')
                  setDraftEdits(null)
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleClose}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
