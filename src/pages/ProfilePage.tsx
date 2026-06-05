import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import { supabase } from '../lib/supabase'

interface ProfilePageProps {
  user: User
}

export function ProfilePage({ user }: ProfilePageProps) {
  const [fullName, setFullName] = useState((user.user_metadata.full_name as string | undefined) ?? '')
  const [avatarUrl, setAvatarUrl] = useState((user.user_metadata.avatar_url as string | undefined) ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const { status, setStatus, resetDashboardPreview } = useWorkspace()

  const saveProfile = async () => {
    setIsSavingProfile(true)

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        avatar_url: avatarUrl || null,
      },
    })

    if (error) {
      setStatus(`Profile update error: ${error.message}`)
      setIsSavingProfile(false)
      return
    }

    setStatus('Profile updated')
    setIsSavingProfile(false)
  }

  const uploadAvatar = async () => {
    if (!avatarFile) {
      setStatus('Select an image file first')
      return
    }

    if (!avatarFile.type.startsWith('image/')) {
      setStatus('Only image files are allowed')
      return
    }

    setIsUploadingAvatar(true)

    const extension = avatarFile.name.split('.').pop()?.toLowerCase() || 'png'
    const filePath = `${user.id}/avatar-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, {
      upsert: true,
      cacheControl: '3600',
    })

    if (uploadError) {
      setStatus(
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
        full_name: fullName,
      },
    })

    if (updateError) {
      setStatus(`Avatar metadata update error: ${updateError.message}`)
      setIsUploadingAvatar(false)
      return
    }

    setAvatarUrl(nextAvatarUrl)
    setAvatarFile(null)
    setStatus('Avatar uploaded')
    setIsUploadingAvatar(false)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setStatus(`Sign out error: ${error.message}`)
      return
    }

    resetDashboardPreview()
  }

  return (
    <div className="space-y-4">
      <section className="page-section bg-slate-50/80">
        <h2 className="section-title">User Profile</h2>
        <p className="section-subtitle">Manage identity details, avatar, and account session.</p>
        <p className="mt-2 text-sm text-slate-700">Signed in as: {user.email ?? 'no email'}</p>
        <p className="mt-1 text-xs text-slate-500">User ID: {user.id}</p>
      </section>

      <div className="page-section max-w-3xl">
        <div className="mt-3 flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="User avatar"
            className="h-16 w-16 rounded-full border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-lg font-semibold text-slate-600">
            {(fullName || user.email || '?').charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">Profile avatar</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                setAvatarFile(file)
              }}
              className="block text-xs text-slate-600"
            />
            <button
              type="button"
              onClick={uploadAvatar}
              disabled={isUploadingAvatar}
              className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploadingAvatar ? 'Uploading...' : 'Upload avatar'}
            </button>
          </div>
        </div>
        </div>
      </div>

      <div className="page-section max-w-3xl bg-slate-50/70">
        <h3 className="section-title">Profile Details</h3>
        <p className="section-subtitle">Last status: {status}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
          />
          <button
            type="button"
            onClick={saveProfile}
            disabled={isSavingProfile}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingProfile ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={signOut}
        className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-300"
      >
        Sign out
      </button>
    </div>
  )
}
