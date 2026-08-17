import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useWorkspace } from '../../features/dashboard/workspace-context.tsx'
import { supabase } from '../../lib/supabase'
import { ConfirmDialog } from '../../shared/components'
import { useAvatarUpload } from './useAvatarUpload'
import { ABOUT_ME_MAX_LENGTH, useProfileDetails } from './useProfileDetails'
import { usePasswordChange } from './usePasswordChange'

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
  const { status, setStatus, loadDashboardPreview, resetDashboardPreview } = useWorkspace()
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
    <div className="space-y-5">
      <section className="page-section relative overflow-hidden border border-cyan-100 bg-[linear-gradient(125deg,rgba(14,116,144,0.1),rgba(236,254,255,0.92)_45%,rgba(236,253,245,0.95))]">
        <div className="pointer-events-none absolute right-[-3rem] top-[-3rem] h-36 w-36 rounded-full bg-cyan-200/30 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700/80">Profile Center</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">{profileName}</h2>
            <p className="mt-2 text-sm text-slate-700">Manage your public profile details and identity settings.</p>
          </div>
          <span className="rounded-full border border-cyan-200 bg-white/80 px-3 py-1 text-xs font-semibold text-cyan-700">
            {isEditingProfile ? 'Editing mode' : 'View mode'}
          </span>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="page-section border border-slate-200 bg-white/90">
          <div className="flex flex-col items-center text-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="User avatar"
                className="h-24 w-24 rounded-full border-2 border-cyan-100 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 text-2xl font-semibold text-slate-600 shadow-sm">
                {avatarInitial}
              </div>
            )}

            <p className="mt-4 text-lg font-semibold text-slate-900">{profileName}</p>
            <p className="mt-1 text-xs text-slate-500">{email || 'no email'}</p>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">Avatar</p>
            <div className="mt-3 flex flex-col gap-2">
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
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Choose image
              </button>
              <button
                type="button"
                onClick={uploadAvatar}
                disabled={isUploadingAvatar || Boolean(avatarEditorState)}
                className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploadingAvatar ? 'Uploading...' : 'Upload avatar'}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2">
            <p className="text-xs font-medium text-amber-900">Status</p>
            <p className="mt-1 text-xs text-amber-800">{status}</p>
          </div>
        </div>

        <div className="page-section border border-slate-200 bg-white/90">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="section-title">Profile Details</h3>
            {!isEditingProfile ? (
              <button
                type="button"
                onClick={startEditingProfile}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
              >
                Edit profile
              </button>
            ) : null}
          </div>

          <p className="section-subtitle mt-1">
            {isEditingProfile
              ? 'You can update your profile fields and save your changes.'
              : 'Click Edit profile to make changes.'}
          </p>

          <div className="mt-4 grid gap-4">
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-600">Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Full name"
                disabled={!isEditingProfile || isSavingProfile}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-600">Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="How your name should be shown"
                disabled={!isEditingProfile || isSavingProfile}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-600">About me</span>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="A short introduction"
                rows={3}
                maxLength={ABOUT_ME_MAX_LENGTH}
                disabled={!isEditingProfile || isSavingProfile}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Up to {ABOUT_ME_MAX_LENGTH} characters.</span>
                <span>{aboutMeLength}/{ABOUT_ME_MAX_LENGTH}</span>
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-600">Email</span>
              <input
                type="email"
                value={email}
                readOnly
                disabled
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              {isEditingProfile ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEditingProfile}
                    disabled={isSavingProfile}
                    className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={isSavingProfile}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save profile'}
                  </button>
                </>
              ) : (
                <span className="text-xs text-slate-500">Fields are locked in view mode.</span>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h4 className="text-sm font-semibold text-slate-900">Change password</h4>
            <p className="mt-1 text-xs text-slate-600">Set a new password for this account.</p>

            <div className="mt-3 grid gap-3">
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                minLength={6}
                disabled={isChangingPassword}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              />

              <input
                type="password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                minLength={6}
                disabled={isChangingPassword}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              />

              <div>
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
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setIsSignOutConfirmOpen(true)}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
      >
        Sign out
      </button>

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
