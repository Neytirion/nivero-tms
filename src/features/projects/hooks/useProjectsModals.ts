import { useState } from 'react'

export interface UseProjectsModalsReturn {
  isCreateModalOpen: boolean
  isCompleteConfirmOpen: boolean
  isSaveSettingsConfirmOpen: boolean
  isDeleteConfirmOpen: boolean
  setIsCreateModalOpen: (open: boolean) => void
  setIsCompleteConfirmOpen: (open: boolean) => void
  setIsSaveSettingsConfirmOpen: (open: boolean) => void
  setIsDeleteConfirmOpen: (open: boolean) => void
}

/**
 * Manage modal/dialog open/close states for projects page
 */
export function useProjectsModals(): UseProjectsModalsReturn {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCompleteConfirmOpen, setIsCompleteConfirmOpen] = useState(false)
  const [isSaveSettingsConfirmOpen, setIsSaveSettingsConfirmOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  return {
    isCreateModalOpen,
    isCompleteConfirmOpen,
    isSaveSettingsConfirmOpen,
    isDeleteConfirmOpen,
    setIsCreateModalOpen,
    setIsCompleteConfirmOpen,
    setIsSaveSettingsConfirmOpen,
    setIsDeleteConfirmOpen,
  }
}
