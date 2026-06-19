import { useMemo, useState } from 'react'
import type { ProjectPreview } from '../../lib/pm'

interface SettingsDraftState {
  projectId: string | null
  name: string
  description: string
  customerName: string
  startDate: string
  deadline: string
}

export interface UseProjectsSettingsFormReturn {
  settingsDraft: SettingsDraftState
  currentSettingsDraft: SettingsDraftState
  setSettingsDraft: (draft: SettingsDraftState) => void
  updateSettingsDraft: (patch: Partial<Omit<SettingsDraftState, 'projectId'>>) => void
  resetSettingsDraft: () => void
}

/**
 * Manage project settings form state (name, description, dates)
 */
export function useProjectsSettingsForm(
  selectedProject: ProjectPreview | null,
): UseProjectsSettingsFormReturn {
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraftState>({
    projectId: null,
    name: '',
    description: '',
    customerName: '',
    startDate: '',
    deadline: '',
  })

  // Compute current draft based on selected project and unsaved changes
  const currentSettingsDraft = useMemo(() => {
    if (!selectedProject) {
      return settingsDraft
    }

    // If we have a draft for the selected project, use it
    if (settingsDraft.projectId === selectedProject.id) {
      return settingsDraft
    }

    // Otherwise, create a draft from the selected project
    return {
      projectId: selectedProject.id,
      name: selectedProject.name ?? '',
      description: selectedProject.description ?? '',
      customerName: selectedProject.customer_name ?? '',
      startDate: selectedProject.start_date ?? '',
      deadline: selectedProject.end_date ?? selectedProject.deadline_at ?? '',
    }
  }, [selectedProject, settingsDraft])

  const updateSettingsDraft = (
    patch: Partial<Omit<SettingsDraftState, 'projectId'>>,
  ) => {
    if (!selectedProject) {
      return
    }

    const baseDraft =
      settingsDraft.projectId === selectedProject.id
        ? settingsDraft
        : {
            projectId: selectedProject.id,
            name: selectedProject.name ?? '',
            description: selectedProject.description ?? '',
            customerName: selectedProject.customer_name ?? '',
            startDate: selectedProject.start_date ?? '',
            deadline: selectedProject.end_date ?? selectedProject.deadline_at ?? '',
          }

    setSettingsDraft({
      ...baseDraft,
      ...patch,
    })
  }

  const resetSettingsDraft = () => {
    setSettingsDraft({
      projectId: null,
      name: '',
      description: '',
      customerName: '',
      startDate: '',
      deadline: '',
    })
  }

  return {
    settingsDraft,
    currentSettingsDraft,
    setSettingsDraft,
    updateSettingsDraft,
    resetSettingsDraft,
  }
}
