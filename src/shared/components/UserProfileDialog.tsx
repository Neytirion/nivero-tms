import { createPortal } from 'react-dom'

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

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Unknown'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return date.toLocaleString()
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
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Profile avatar"
              className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-cyan-800">
              {initials || '?'}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-900">{profileName}</h3>
            <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-slate-500">Member profile</p>
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Email</dt>
            <dd className="truncate font-medium text-slate-800">{profile.email || 'No email'}</dd>
          </div>
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Role</dt>
            <dd className="font-medium capitalize text-slate-800">{profile.role || 'Unknown'}</dd>
          </div>
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Joined</dt>
            <dd className="font-medium text-slate-800">{formatDateTime(profile.joinedAt)}</dd>
          </div>
        </dl>

        {profile.aboutMe?.trim() ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">About me</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{profile.aboutMe.trim()}</p>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}