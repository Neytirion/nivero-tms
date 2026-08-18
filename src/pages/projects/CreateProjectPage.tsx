import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AiProjectGeneratorModal } from '../../features/projects/ai'
import { useWorkspace } from '../../features/dashboard/workspace-context'
import type { AiProjectDraft } from '../../lib/ai'
import { ProjectCreationWizard } from './wizard/ProjectCreationWizard'
import type { ProjectWizardData } from './wizard/types'

export function CreateProjectPage() {
  const navigate = useNavigate()
  const { addProject, setStatus, projects, projectMembers } = useWorkspace()
  const [isLoading, setIsLoading] = useState(false)
  const [showAIMode, setShowAIMode] = useState(false)

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

  const handleCancel = () => {
    navigate('/app/projects')
  }

  const handleCreateProject = async (data: ProjectWizardData) => {
    setIsLoading(true)
    try {
      const projectId = await addProject({
        name: data.projectName.trim(),
        description: data.projectDescription.trim() || undefined,
        customerName: data.companyName.trim() || undefined,
        budgetAmount:
          data.projectBudgetAmount.trim().length > 0 && Number.isFinite(Number(data.projectBudgetAmount))
            ? Number(data.projectBudgetAmount)
            : undefined,
        startDate: data.projectStartDate || undefined,
        endDate: data.projectEndDate || undefined,
      })
      if (projectId) {
        navigate(`/app/projects/${projectId}`)
      } else {
        navigate('/app/projects')
      }
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

  const handleSelectAI = () => {
    setShowAIMode(true)
  }

  const handleCreateFromAiDraft = async (draft: AiProjectDraft) => {
    setIsLoading(true)
    try {
      const projectId = await addProject({
        name: draft.project.name,
        description: draft.project.description || undefined,
        customerName: draft.project.customer_name || undefined,
        startDate: draft.project.start_date || undefined,
        endDate: draft.project.end_date || undefined,
      })
      if (projectId) {
        navigate(`/app/projects/${projectId}`)
      } else {
        navigate('/app/projects')
      }
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

  if (showAIMode) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4">
            <button
              onClick={() => setShowAIMode(false)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Mode Selection
            </button>
          </div>
          <AiProjectGeneratorModal
            isOpen
            variant="inline"
            onClose={() => setShowAIMode(false)}
            onConfirm={handleCreateFromAiDraft}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-3xl">
        <ProjectCreationWizard
          customerSuggestions={customerSuggestions}
          projectMembers={projectMembers}
          isLoading={isLoading}
          onCreateProject={handleCreateProject}
          onSelectAI={handleSelectAI}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}
