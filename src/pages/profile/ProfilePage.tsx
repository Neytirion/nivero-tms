import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Camera, Check, LockKeyhole, LogOut, Mail, Pencil, X } from 'lucide-react'
import { useWorkspace } from '../../features/workspace/workspace-context.tsx'
import { supabase } from '../../lib/supabase'
import { ConfirmDialog } from '../../shared/components'
import { useAvatarUpload } from '../../features/profile/hooks/useAvatarUpload'
import {
  ABOUT_ME_MAX_LENGTH,
  PROFILE_NAME_MAX_LENGTH,
  useProfileDetails,
} from '../../features/profile/hooks/useProfileDetails'
import { usePasswordChange } from '../../features/profile/hooks/usePasswordChange'

interface ProfilePageProps {
  user: User
}

interface AvatarEditorModalProps {
  sourceUrl: string
  fileName: string
  onClose: () => void
  onApply: (file: File) => void
  setStatus: (status: string) => void
}

function AvatarEditorModal({ sourceUrl, fileName, onClose, onApply, setStatus }: AvatarEditorModalProps) {
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [isPreparing, setIsPreparing] = useState(false)

  const buildPreparedAvatarFile = async () => {
    const image = new Image()
    image.src = sourceUrl

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Failed to load selected image'))
    })

    const canvasSize = 512
    const canvas = document.createElement('canvas')
    canvas.width = canvasSize
    canvas.height = canvasSize

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas context is unavailable')
    }

    const coverScale = Math.max(canvasSize / image.naturalWidth, canvasSize / image.naturalHeight) * scale
    const drawWidth = image.naturalWidth * coverScale
    const drawHeight = image.naturalHeight * coverScale
    const drawX = canvasSize / 2 - drawWidth / 2 + offsetX
    const drawY = canvasSize / 2 - drawHeight / 2 + offsetY

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.clearRect(0, 0, canvasSize, canvasSize)
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (!nextBlob) {
          reject(new Error('Failed to prepare image'))
          return
        }
        resolve(nextBlob)
      }, 'image/png')
    })

    return new File([blob], `avatar-prepared-${Date.now()}.png`, { type: 'image/png' })
  }

  const applyAvatarAdjustments = async () => {
    setIsPreparing(true)
    try {
      const preparedFile = await buildPreparedAvatarFile()
      onApply(preparedFile)
      setStatus('Image prepared. Click "Upload avatar" to save.')
      onClose()
    } catch {
      setStatus('Failed to prepare image. Please try another file.')
      setIsPreparing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close avatar editor"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
      />

      <section className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-900">Adjust avatar</h3>
        <p className="mt-1 text-xs text-slate-600">
          Set framing before upload: zoom and move the image to match your preferred crop.
        </p>
        <p className="mt-1 truncate text-xs text-slate-500">{fileName}</p>

        <div className="mt-4 flex justify-center">
          <div className="relative h-56 w-56 overflow-hidden rounded-full border-2 border-cyan-100 bg-slate-100">
            <img
              src={sourceUrl}
              alt="Avatar preview"
              className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full max-w-none object-cover"
              style={{
                transform: `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), 0) scale(${scale})`,
                transformOrigin: 'center center',
                willChange: 'transform',
              }}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-700">Zoom: {scale.toFixed(2)}x</span>
            <input
              type="range"
              min={100}
              max={300}
              step={1}
              value={Math.round(scale * 100)}
              onChange={(event) => setScale(Number(event.target.value) / 100)}
              className="mt-1 w-full"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-700">Horizontal position</span>
            <input
              type="range"
              min={-120}
              max={120}
              step={1}
              value={offsetX}
              onChange={(event) => setOffsetX(Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-700">Vertical position</span>
            <input
              type="range"
              min={-120}
              max={120}
              step={1}
              value={offsetY}
              onChange={(event) => setOffsetY(Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPreparing}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void applyAvatarAdjustments()}
            disabled={isPreparing}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPreparing ? 'Preparing...' : 'Apply'}
          </button>
        </div>
      </section>
    </div>
  )
}

export function ProfilePage({ user }: ProfilePageProps) {
  const email = user.email ?? ''
  const { setStatus, loadDashboardPreview, resetDashboardPreview } = useWorkspace()
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false)
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null)
  const [avatarEditorState, setAvatarEditorState] = useState<{ src: string; fileName: string } | null>(null)

  const {
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
  } = useProfileDetails({
    user,
    setStatus,
    onProfileSaved: loadDashboardPreview,
  })

  const { setAvatarFile, isUploadingAvatar, uploadAvatar } = useAvatarUpload({
    userId: user.id,
    fullName,
    displayName,
    bio,
    setAvatarUrl,
    setStatus,
  })

  const {
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    isChangingPassword,
    changePassword,
  } = usePasswordChange({ setStatus })

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setStatus(`Sign out error: ${error.message}`)
      return
    }

    setIsSignOutConfirmOpen(false)
    resetDashboardPreview()
  }

  const profileName = displayName || fullName || 'Team member'
  const avatarInitial = (profileName || email || '?').charAt(0).toUpperCase()
  const aboutMeLength = bio.trim().length

  const closeAvatarEditor = () => {
    if (avatarEditorState) {
      URL.revokeObjectURL(avatarEditorState.src)
    }
    setAvatarEditorState(null)
  }

  useEffect(() => {
    return () => {
      if (avatarEditorState) {
        URL.revokeObjectURL(avatarEditorState.src)
      }
    }
  }, [avatarEditorState])

  const handleAvatarFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setStatus('Only image files are allowed')
      event.target.value = ''
      return
    }

    setAvatarEditorState({ src: URL.createObjectURL(file), fileName: file.name })
    setStatus('Adjust image and click Apply before upload')
    event.target.value = ''
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <h2 className="text-2xl font-bold text-slate-950">Profile</h2>
        <p className="mt-1 text-sm text-slate-600">Your personal details and account settings.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="page-section bg-white">
          <div className="flex flex-col items-center px-2 py-3 text-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="User avatar"
                className="h-28 w-28 rounded-lg border border-slate-200 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-slate-200 bg-cyan-50 text-3xl font-semibold text-cyan-800 shadow-sm">
                {avatarInitial}
              </div>
            )}

            <p className="mt-4 text-lg font-semibold text-slate-900">{profileName}</p>
            <p className="mt-1 flex max-w-full items-center gap-1.5 text-sm text-slate-500">
              <Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{email || 'No email address'}</span>
            </p>
          </div>

          {isEditingProfile ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileSelection}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => avatarFileInputRef.current?.click()}
                disabled={isUploadingAvatar || Boolean(avatarEditorState)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Camera aria-hidden="true" className="h-4 w-4" />
                Choose photo
              </button>
              <button
                type="button"
                onClick={uploadAvatar}
                disabled={isUploadingAvatar || Boolean(avatarEditorState)}
                className="mt-2 w-full rounded-lg bg-cyan-700 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploadingAvatar ? 'Uploading...' : 'Save new photo'}
              </button>
            </div>
          ) : null}
        </section>

        <section className="page-section bg-white">
          <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
            <h3 className="section-title">Personal information</h3>
            {!isEditingProfile ? (
              <button
                type="button"
                onClick={startEditingProfile}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil aria-hidden="true" className="h-4 w-4" />
                Edit profile
              </button>
            ) : null}
          </div>

          {isEditingProfile ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Full name</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your full name"
                  maxLength={PROFILE_NAME_MAX_LENGTH}
                  required
                  disabled={isSavingProfile}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed"
                />
                <p className="text-right text-xs text-slate-500">{fullName.length}/{PROFILE_NAME_MAX_LENGTH}</p>
              </label>

              <label className="space-y-1.5">
                <span className="flex items-center justify-between gap-2 text-sm font-medium text-slate-700">
                  Display name
                  <span className="text-xs font-normal text-slate-500">Optional</span>
                </span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Name shown to your team"
                  maxLength={PROFILE_NAME_MAX_LENGTH}
                  disabled={isSavingProfile}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed"
                />
                <p className="text-right text-xs text-slate-500">{displayName.length}/{PROFILE_NAME_MAX_LENGTH}</p>
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">About</span>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="A short introduction"
                  rows={4}
                  maxLength={ABOUT_ME_MAX_LENGTH}
                  disabled={isSavingProfile}
                  className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed"
                />
                <p className="text-right text-xs text-slate-500">{aboutMeLength}/{ABOUT_ME_MAX_LENGTH}</p>
              </label>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 sm:col-span-2">
                  <button
                    type="button"
                    onClick={cancelEditingProfile}
                    disabled={isSavingProfile}
                    className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={isSavingProfile}
                    className="flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Check aria-hidden="true" className="h-4 w-4" />
                    {isSavingProfile ? 'Saving...' : 'Save profile'}
                  </button>
              </div>
            </div>
          ) : (
            <dl className="mt-5 divide-y divide-slate-200">
              <div className="grid gap-1 py-4 sm:grid-cols-[150px_1fr] sm:gap-4">
                <dt className="text-sm text-slate-500">Full name</dt>
                <dd className="text-sm font-medium text-slate-900">{fullName || 'Not provided'}</dd>
              </div>
              <div className="grid gap-1 py-4 sm:grid-cols-[150px_1fr] sm:gap-4">
                <dt className="text-sm text-slate-500">Display name</dt>
                <dd className="text-sm font-medium text-slate-900">{displayName || 'Not provided'}</dd>
              </div>
              <div className="grid gap-1 py-4 sm:grid-cols-[150px_1fr] sm:gap-4">
                <dt className="text-sm text-slate-500">Email</dt>
                <dd className="break-all text-sm font-medium text-slate-900">{email || 'Not provided'}</dd>
              </div>
              <div className="grid gap-1 py-4 sm:grid-cols-[150px_1fr] sm:gap-4">
                <dt className="text-sm text-slate-500">About</dt>
                <dd className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{bio || 'Not provided'}</dd>
              </div>
            </dl>
          )}
        </section>
      </div>

      <section className="page-section bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <LockKeyhole aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h3 className="section-title">Password</h3>
            <p className="section-subtitle">Use at least 6 characters.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                minLength={6}
                disabled={isChangingPassword}
                className="w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed"
              />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Confirm password</span>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                minLength={6}
                disabled={isChangingPassword}
                className="w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed"
              />
          </label>

          <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={changePassword}
                  disabled={isChangingPassword}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isChangingPassword ? 'Updating...' : 'Update password'}
                </button>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 py-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Sign out of this account</h3>
          <p className="mt-1 text-xs text-slate-500">You will return to the sign-in screen.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsSignOutConfirmOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
          Sign out
        </button>
      </section>

      {avatarEditorState ? (
        <AvatarEditorModal
          sourceUrl={avatarEditorState.src}
          fileName={avatarEditorState.fileName}
          onClose={closeAvatarEditor}
          onApply={(file) => {
            setAvatarFile(file)
          }}
          setStatus={setStatus}
        />
      ) : null}

      <ConfirmDialog
        isOpen={isSignOutConfirmOpen}
        title="Sign out"
        description="Do you want to sign out?"
        confirmText="Sign out"
        cancelText="Cancel"
        tone="danger"
        onCancel={() => setIsSignOutConfirmOpen(false)}
        onConfirm={signOut}
      />
    </div>
  )
}
