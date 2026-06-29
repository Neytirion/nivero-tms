import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AiProjectGeneratorModal } from '../../features/projects/ai'
import { useProjectForm } from '../../features/projects/hooks/useProjectForm'
import { useWorkspace } from '../../features/dashboard/workspace-context'
import type { AiProjectDraft } from '../../lib/ai'

export function CreateProjectPage() {
  const navigate = useNavigate()
  const { addProject, setStatus } = useWorkspace()
  const [mode, setMode] = useState<'manual' | 'ai'>('manual')
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    projectName,
    setProjectName,
    projectCustomer,
    setProjectCustomer,
    projectStartDate,
    setProjectStartDate,
    projectEndDate,
    setProjectEndDate,
    canSubmit,
    reset,
  } = useProjectForm()

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
        name: draft.name,
        customerName: draft.customer || undefined,
        startDate: draft.startDate || undefined,
        endDate: draft.endDate || undefined,
      })
      reset()
      setIsAiGeneratorOpen(false)
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
                      value={projectCustomer}
                      onChange={(event) => setProjectCustomer(event.target.value)}
                      placeholder="ABC Ltd"
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
              </div>
            )}

            {/* AI mode info */}
            {mode === 'ai' && (
              <div className="rounded-lg bg-blue-50 p-6 text-center">
                <div className="inline-block rounded-full bg-blue-100 p-3 mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="font-semibold text-blue-900">Generate Project with AI</p>
                <p className="mt-2 text-sm text-blue-700">
                  Click "Generate Project" to open the AI generator and describe your project. The AI will create a structured project plan for you.
                </p>
              </div>
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
            ) : (
              <button
                type="button"
                onClick={() => setIsAiGeneratorOpen(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-75 hover:bg-blue-500"
              >
                Generate Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Generator Modal */}
      {isAiGeneratorOpen && (
        <AiProjectGeneratorModal
          isOpen={isAiGeneratorOpen}
          onClose={() => {
            setIsAiGeneratorOpen(false)
            setMode('manual')
          }}
          onConfirm={handleCreateFromAiDraft}
        />
      )}
    </div>
  )
}
