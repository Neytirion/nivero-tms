import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface UsePasswordChangeInput {
  setStatus: (status: string) => void
}

export function usePasswordChange(input: UsePasswordChangeInput) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      input.setStatus('Password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmNewPassword) {
      input.setStatus('New password and confirmation do not match')
      return
    }

    setIsChangingPassword(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      input.setStatus(`Password change error: ${error.message}`)
      setIsChangingPassword(false)
      return
    }

    setNewPassword('')
    setConfirmNewPassword('')
    input.setStatus('Password updated successfully')
    setIsChangingPassword(false)
  }

  return {
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    isChangingPassword,
    changePassword,
  }
}
