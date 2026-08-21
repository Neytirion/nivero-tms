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
  const {
    addProject,
    setStatus,
    projects,
    currentUserProfile,
    selectProject,
    reloadProjectData,
  } = useWorkspace()
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
        useEstimates: true,
      })

      if (!projectId) {
        navigate('/app/projects')
        return
      }

      // Navigate immediately to the new project details (Overview tab by default).
      navigate(`/app/projects/${projectId}`)

      // Create initial estimate version when work packages were provided in wizard.
      if (data.workPackages.length > 0) {
        try {
          await createInitialEstimateVersion(projectId, data.workPackages)
        } catch (error) {
          console.error('Failed to create initial estimate version:', error)
          setStatus('Project created, but estimate version could not be initialized')
        }
      }

      // Invite team members if any, but never invite the current user.
      if (data.teamInvitations.length > 0) {
        const currentUserEmail = currentUserProfile?.email?.trim().toLowerCase() ?? null
        const sanitizedInvitations = data.teamInvitations.filter((invitation) => {
          const invitationEmail = invitation.email.trim().toLowerCase()
          return !currentUserEmail || invitationEmail !== currentUserEmail
        })
        const skippedSelfInvites = data.teamInvitations.length - sanitizedInvitations.length

        const invitationResults = await Promise.allSettled(
          sanitizedInvitations.map((invitation) =>
            inviteProjectMemberByEmail({
              projectId,
              email: invitation.email,
              role: invitation.role,
            }),
          ),
        )

        const failedInvitations = invitationResults
          .map((result, idx) => (result.status === 'rejected' ? sanitizedInvitations[idx].email : null))
          .filter((email): email is string => email !== null)
        const missingUserInvitations = invitationResults
          .map((result, idx) => {
            if (result.status !== 'rejected') return null
            const message = result.reason instanceof Error ? result.reason.message.toLowerCase() : ''
            return message.includes('user with this email was not found')
              ? sanitizedInvitations[idx].email
              : null
          })
          .filter((email): email is string => email !== null)

        if (failedInvitations.length > 0) {
          console.warn('Failed to invite members:', failedInvitations)
          if (missingUserInvitations.length > 0) {
            setStatus(`Project created. User with this email does not exist: ${missingUserInvitations.join(', ')}`)
          } else {
            setStatus(`Project created. Could not invite: ${failedInvitations.join(', ')}`)
          }
        } else if (sanitizedInvitations.length > 0) {
          setStatus(`✓ Project created and ${sanitizedInvitations.length} member(s) invited`)
        } else if (skippedSelfInvites > 0) {
          setStatus('Project created. Your own email was skipped from invitations')
        }
      }

      // Ensure project members are up to date before opening project details.
      try {
        selectProject(projectId)
        await reloadProjectData(projectId)
      } catch {
        // Non-fatal: details page will still attempt to load project data.
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
        useEstimates: true,
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
          currentUserEmail={currentUserProfile?.email ?? null}
          isLoading={isLoading}
          onCreateProject={handleCreateProject}
          onSelectAI={handleSelectAI}
        />
      </div>
    </div>
  )
}
