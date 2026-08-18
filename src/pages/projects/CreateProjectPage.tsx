import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AiProjectGeneratorModal } from '../../features/projects/ai'
import { useWorkspace } from '../../features/dashboard/workspace-context'
import type { AiProjectDraft } from '../../lib/ai'
import { createInitialEstimateVersion } from '../../lib/pm/estimates'
import { inviteProjectMemberByEmail } from '../../lib/pm/members'
import { ProjectCreationWizard } from './wizard/ProjectCreationWizard'
import type { ProjectWizardData } from './wizard/types'

export function CreateProjectPage() {
  const navigate = useNavigate()
  const { addProject, setStatus, projects } = useWorkspace()
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
        useEstimates: data.useEstimates,
      })

      if (!projectId) {
        navigate('/app/projects')
        return
      }

      // Create initial estimate version with work packages if enabled
      if (data.useEstimates && data.workPackages.length > 0) {
        try {
          await createInitialEstimateVersion(projectId, data.workPackages)
        } catch (error) {
          console.error('Failed to create initial estimate version:', error)
          setStatus('Project created, but estimate version could not be initialized')
        }
      }

      // Invite team members if any
      if (data.teamInvitations.length > 0) {
        const invitationResults = await Promise.allSettled(
          data.teamInvitations.map((invitation) =>
            inviteProjectMemberByEmail({
              projectId,
              email: invitation.email,
              role: invitation.role,
            }),
          ),
        )

        const failedInvitations = invitationResults
          .map((result, idx) => (result.status === 'rejected' ? data.teamInvitations[idx].email : null))
          .filter((email): email is string => email !== null)

        if (failedInvitations.length > 0) {
          console.warn('Failed to invite members:', failedInvitations)
          setStatus(
            `Project created with estimates. Could not invite: ${failedInvitations.join(', ')}`,
          )
        } else if (data.teamInvitations.length > 0) {
          setStatus(`✓ Project created and ${data.teamInvitations.length} member(s) invited`)
        }
      }

      navigate(`/app/projects/${projectId}`)
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
          isLoading={isLoading}
          onCreateProject={handleCreateProject}
          onSelectAI={handleSelectAI}
        />
      </div>
    </div>
  )
}
