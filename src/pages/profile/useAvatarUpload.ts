import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface UseAvatarUploadInput {
  userId: string
  fullName: string
  displayName: string
  bio: string
  setAvatarUrl: (value: string) => void
  setStatus: (status: string) => void
}

export function useAvatarUpload(input: UseAvatarUploadInput) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const uploadAvatar = async () => {
    if (!avatarFile) {
      input.setStatus('Select an image file first')
      return
    }

    if (!avatarFile.type.startsWith('image/')) {
      input.setStatus('Only image files are allowed')
      return
    }

    setIsUploadingAvatar(true)

    const extension = avatarFile.name.split('.').pop()?.toLowerCase() || 'png'
    const filePath = `${input.userId}/avatar-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, {
      upsert: true,
      cacheControl: '3600',
    })

    if (uploadError) {
      input.setStatus(
        `Avatar upload error: ${uploadError.message}. Ensure Storage bucket "avatars" exists and allows upload for authenticated users.`,
      )
      setIsUploadingAvatar(false)
      return
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const nextAvatarUrl = publicUrlData.publicUrl

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        avatar_url: nextAvatarUrl,
        full_name: input.fullName.trim() || null,
        display_name: input.displayName.trim() || null,
        bio: input.bio.trim() || null,
      },
    })

    if (updateError) {
      input.setStatus(`Avatar metadata update error: ${updateError.message}`)
      setIsUploadingAvatar(false)
      return
    }

    input.setAvatarUrl(nextAvatarUrl)
    setAvatarFile(null)
    input.setStatus('Avatar uploaded')
    setIsUploadingAvatar(false)
  }

  return {
    setAvatarFile,
    isUploadingAvatar,
    uploadAvatar,
  }
}
