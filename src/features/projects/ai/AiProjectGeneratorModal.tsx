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
  const [fileName, setFileName] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const { isLoading, error, preview, validationErrors, generate, reset } = useGenerateProject()

  if (!isOpen) return null

  const handleGenerate = async () => {
    await generate(inputText)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const text = await file.text()
    setInputText(text)
  }

  const handleConfirm = async () => {
    if (!preview) return

    setIsConfirming(true)
    try {
      await onConfirm(preview)
      reset()
      setInputText('')
      setFileName(null)
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
    setFileName(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-2xl font-bold">Generate Project with AI</h2>

        {!preview ? (
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
              {fileName && <p className="mt-1 text-xs text-gray-500">Uploaded: {fileName}</p>}
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Or Upload a File</label>
              <input
                type="file"
                accept=".txt,.md,.doc,.docx"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="block w-full text-sm text-gray-500 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-600 hover:file:bg-blue-100 disabled:opacity-50"
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
            <h3 className="text-lg font-semibold">Preview Your Project</h3>

            {/* Project info */}
            <div className="rounded-lg bg-blue-50 p-4">
              <h4 className="font-semibold text-blue-900">{preview.project.name}</h4>
              {preview.project.description && <p className="mt-1 text-sm text-blue-800">{preview.project.description}</p>}
              {preview.project.customer_name && (
                <p className="mt-1 text-xs text-blue-700">Customer: {preview.project.customer_name}</p>
              )}
              <div className="mt-2 flex gap-4 text-xs text-blue-700">
                {preview.project.start_date && <div>Starts: {preview.project.start_date}</div>}
                {preview.project.end_date && <div>Ends: {preview.project.end_date}</div>}
                <div>Est. Hours: {preview.project.estimated_hours}</div>
                {preview.project.budget_amount && <div>Budget: ${preview.project.budget_amount}</div>}
              </div>
            </div>

            {/* Work packages and tasks preview */}
            <div className="space-y-3">
              {preview.estimates.work_packages.map((pkg, pkgIdx) => (
                <div key={pkgIdx} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium">{pkg.name}</h5>
                    <span className="text-xs font-semibold text-gray-600">{pkg.estimated_hours}h</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {pkg.tasks.slice(0, 3).map((task, taskIdx) => (
                      <li key={taskIdx} className="text-sm text-gray-700">
                        • {task.title}
                        <span className="ml-2 inline-block rounded px-2 py-0.5 text-xs bg-gray-100">
                          {task.priority}
                        </span>
                        <span className="ml-2 text-gray-500">{task.estimate_hours}h</span>
                      </li>
                    ))}
                    {pkg.tasks.length > 3 && (
                      <li className="text-xs text-gray-500 italic">
                        ... and {pkg.tasks.length - 3} more tasks
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                disabled={isConfirming}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-500 disabled:bg-gray-300"
              >
                {isConfirming ? 'Creating...' : 'Create Project'}
              </button>
              <button
                onClick={() => {
                  reset()
                  setInputText('')
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
