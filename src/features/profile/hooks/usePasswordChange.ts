import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

interface UsePasswordChangeInput {
  email: string
  setStatus: (status: string) => void
}

export function usePasswordChange(input: UsePasswordChangeInput) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const changePassword = async () => {
    if (!currentPassword) {
      input.setStatus('Enter your current password')
      return false
    }

    if (!newPassword || newPassword.length < 6) {
      input.setStatus('Password must be at least 6 characters long')
      return false
    }

    if (newPassword !== confirmNewPassword) {
      input.setStatus('New password and confirmation do not match')
      return false
    }

    setIsChangingPassword(true)

    const { error: authenticationError } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: currentPassword,
    })

    if (authenticationError) {
      input.setStatus('Current password is incorrect')
      setIsChangingPassword(false)
      return false
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      input.setStatus(`Password change error: ${error.message}`)
      setIsChangingPassword(false)
      return false
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    input.setStatus('Password updated successfully')
    setIsChangingPassword(false)
    return true
  }

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    isChangingPassword,
    changePassword,
  }
}
