import { createPortal } from 'react-dom'
import { Mail, X } from 'lucide-react'

export interface UserProfilePreview {
  userId?: string | null
  displayName?: string | null
  fullName?: string | null
  email?: string | null
  avatarUrl?: string | null
  role?: string | null
  joinedAt?: string | null
  aboutMe?: string | null
}

interface UserProfileDialogProps {
  isOpen: boolean
  profile: UserProfilePreview | null
  onClose: () => void
}

export function UserProfileDialog({ isOpen, profile, onClose }: UserProfileDialogProps) {
  if (!isOpen || !profile) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const profileName = profile.displayName || profile.fullName || profile.email || profile.userId || 'Unknown user'
  const initials = profileName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close profile dialog backdrop"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-profile-name"
        className="relative z-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center px-4 text-center">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Profile avatar"
              className="h-24 w-24 shrink-0 rounded-lg border border-slate-200 object-cover shadow-sm"
            />
          ) : (
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-cyan-100 bg-cyan-50 text-2xl font-bold text-cyan-800 shadow-sm">
              {initials || '?'}
            </span>
          )}
          <h3 id="user-profile-name" className="mt-4 max-w-full break-words text-lg font-semibold text-slate-950">
            {profileName}
          </h3>
          <p className="mt-1 flex max-w-full items-center justify-center gap-1.5 text-sm text-slate-500">
            <Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="break-all">{profile.email || 'No email address'}</span>
          </p>
        </div>

        {profile.aboutMe?.trim() ? (
          <div className="mt-5 border-t border-slate-200 pt-4">
            <h4 className="text-sm font-semibold text-slate-900">About me</h4>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{profile.aboutMe.trim()}</p>
          </div>
        ) : null}
      </section>
    </div>,
    document.body,
  )
}