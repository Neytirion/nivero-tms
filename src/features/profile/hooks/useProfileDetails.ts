import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { PROFILE_NAME_MAX_LENGTH } from '../../../shared/utils/user-profile'

export const ABOUT_ME_MAX_LENGTH = 160
export { PROFILE_NAME_MAX_LENGTH } from '../../../shared/utils/user-profile'

interface UseProfileDetailsInput {
  user: User
  setStatus: (status: string) => void
  onProfileSaved?: () => void | Promise<void>
}

interface ProfileSnapshot {
  fullName: string
  displayName: string
  bio: string
}

function getInitialSnapshot(user: User): ProfileSnapshot {
  return {
    fullName: (user.user_metadata.full_name as string | undefined) ?? '',
    displayName: (user.user_metadata.display_name as string | undefined) ?? '',
    bio: (user.user_metadata.bio as string | undefined) ?? '',
  }
}

function getInitialAvatarUrl(user: User) {
  return (user.user_metadata.avatar_url as string | undefined) ?? ''
}

export function useProfileDetails(input: UseProfileDetailsInput) {
  const initialSnapshot = getInitialSnapshot(input.user)

  const [fullName, setFullName] = useState(initialSnapshot.fullName)
  const [displayName, setDisplayName] = useState(initialSnapshot.displayName)
  const [bio, setBio] = useState(initialSnapshot.bio)
  const [editSnapshot, setEditSnapshot] = useState<ProfileSnapshot>(initialSnapshot)
  const [avatarUrl, setAvatarUrl] = useState(getInitialAvatarUrl(input.user))
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const startEditingProfile = () => {
    setEditSnapshot({
      fullName,
      displayName,
      bio,
    })
    setIsEditingProfile(true)
  }

  const cancelEditingProfile = () => {
    setFullName(editSnapshot.fullName)
    setDisplayName(editSnapshot.displayName)
    setBio(editSnapshot.bio)
    setIsEditingProfile(false)
    input.setStatus('Profile editing canceled')
  }

  const saveProfile = async () => {
    if (!isEditingProfile) {
      return
    }

    setIsSavingProfile(true)

    const nextFullName = fullName.trim().slice(0, PROFILE_NAME_MAX_LENGTH)
    const nextDisplayName = displayName.trim().slice(0, PROFILE_NAME_MAX_LENGTH)
    const nextBio = bio.trim().slice(0, ABOUT_ME_MAX_LENGTH)

    if (!nextFullName) {
      input.setStatus('Full name is required')
      setIsSavingProfile(false)
      return
    }

    const updatePayload: {
      data: {
        full_name: string | null
        display_name: string | null
        bio: string | null
        avatar_url: string | null
      }
    } = {
      data: {
        full_name: nextFullName || null,
        display_name: nextDisplayName || null,
        bio: nextBio || null,
        avatar_url: avatarUrl || null,
      },
    }

    const { error } = await supabase.auth.updateUser(updatePayload)

    if (error) {
      input.setStatus(`Profile update error: ${error.message}`)
      setIsSavingProfile(false)
      return
    }

    setFullName(nextFullName)
    setDisplayName(nextDisplayName)
    setBio(nextBio)
    setEditSnapshot({
      fullName: nextFullName,
      displayName: nextDisplayName,
      bio: nextBio,
    })
    setIsEditingProfile(false)
    input.setStatus('Profile updated')
    try {
      await input.onProfileSaved?.()
    } finally {
      setIsSavingProfile(false)
    }
  }

  return {
    fullName,
    setFullName,
    displayName,
    setDisplayName,
    bio,
    setBio,
    avatarUrl,
    setAvatarUrl,
    isEditingProfile,
    isSavingProfile,
    startEditingProfile,
    cancelEditingProfile,
    saveProfile,
  }
}
