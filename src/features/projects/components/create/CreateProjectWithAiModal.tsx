/**
 * Create Project Modal with AI tab support
 * Allows manual project creation or AI-powered generation
 */

import { useState } from 'react'
import { AiProjectGeneratorModal } from '../../ai'
import type { AiProjectDraft } from '../../../../lib/ai'

interface CreateProjectWithAiModalProps {
  isOpen: boolean
  projectName: string
  projectCustomer: string
  projectStartDate: string
  projectEndDate: string
  isLoading: boolean
  canSubmit: boolean
  onProjectNameChange: (value: string) => void
  onProjectCustomerChange: (value: string) => void
  onProjectStartDateChange: (value: string) => void
  onProjectEndDateChange: (value: string) => void
  onCreate: () => void | Promise<void>
  onCreateFromAiDraft: (draft: AiProjectDraft) => Promise<void>
  onClose: () => void
}

export function CreateProjectWithAiModal({
  isOpen,
  projectName,
  projectCustomer,
  projectStartDate,
  projectEndDate,
  isLoading,
  canSubmit,
  onProjectNameChange,
  onProjectCustomerChange,
  onProjectStartDateChange,
  onProjectEndDateChange,
  onCreate,
  onCreateFromAiDraft,
  onClose,
}: CreateProjectWithAiModalProps) {
  const [mode, setMode] = useState<'manual' | 'ai'>('manual')
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false)

  if (!isOpen) {
    return null
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close create project modal"
          className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
        />

        <section className="relative z-10 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Create Project</h2>
              <p className="mt-1 text-sm text-slate-500">Choose how to create your project</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          {/* Tab buttons */}
          <div className="mt-4 flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setMode('manual')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                mode === 'manual'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Manual
            </button>
            <button
              onClick={() => {
                setMode('ai')
                setIsAiGeneratorOpen(true)
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                mode === 'ai'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              AI Generator
            </button>
          </div>

          {/* Manual mode */}
          {mode === 'manual' && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Name</span>
                <input
                  type="text"
                  value={projectName}
                  onChange={(event) => onProjectNameChange(event.target.value)}
                  placeholder="Website Redesign"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customer
                </span>
                <input
                  type="text"
                  value={projectCustomer}
                  onChange={(event) => onProjectCustomerChange(event.target.value)}
                  placeholder="ABC Ltd"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Start Date
                </span>
                <input
                  type="date"
                  value={projectStartDate}
                  onChange={(event) => onProjectStartDateChange(event.target.value)}
                  aria-label="Start Date"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  End Date
                </span>
                <input
                  type="date"
                  value={projectEndDate}
                  onChange={(event) => onProjectEndDateChange(event.target.value)}
                  aria-label="End Date"
                  required
                  min={projectStartDate || undefined}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </label>
            </div>
          )}

          {/* AI mode info */}
          {mode === 'ai' && (
            <div className="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
              <p className="font-medium">Generate with AI</p>
              <p className="mt-1 text-xs">
                Click "Generate Project" to open the AI generator and describe your project.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            {mode === 'manual' ? (
              <button
                type="button"
                onClick={() => void onCreate()}
                disabled={isLoading || !canSubmit}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Create project
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAiGeneratorOpen(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                Generate Project
              </button>
            )}
          </div>
        </section>
      </div>

      {/* AI Generator Modal */}
      <AiProjectGeneratorModal
        isOpen={isAiGeneratorOpen}
        onClose={() => {
          setIsAiGeneratorOpen(false)
          setMode('manual')
        }}
        onConfirm={onCreateFromAiDraft}
      />
    </>
  )
}
