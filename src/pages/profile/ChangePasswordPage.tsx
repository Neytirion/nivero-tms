import { useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { usePasswordChange } from '../../features/profile/hooks/usePasswordChange'
import { useWorkspace } from '../../features/workspace/workspace-context'

interface ChangePasswordPageProps {
  user: User
}

export function ChangePasswordPage({ user }: ChangePasswordPageProps) {
  const navigate = useNavigate()
  const { setStatus } = useWorkspace()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    isChangingPassword,
    changePassword,
  } = usePasswordChange({ email: user.email ?? '', setStatus })

  const submitPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const wasUpdated = await changePassword()
    if (wasUpdated) {
      navigate('/app/profile')
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <header>
        <Link
          to="/app/profile"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to profile
        </Link>
        <h2 className="mt-4 text-2xl font-bold text-slate-950">Change password</h2>
      </header>

      <section className="page-section bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-800">
            <KeyRound aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h3 className="section-title">Password details</h3>
            <p className="section-subtitle">Confirm your current password before setting a new one.</p>
          </div>
        </div>

        <form className="mt-5 space-y-4" onSubmit={submitPasswordChange}>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Current password</span>
            <span className="relative block">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required
                disabled={isChangingPassword}
                className="w-full rounded-lg border py-2.5 pl-3 pr-11 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                onClick={() => setShowCurrentPassword((isVisible) => !isVisible)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-800"
              >
                {showCurrentPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              </button>
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">New password</span>
            <span className="relative block">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
                disabled={isChangingPassword}
                className="w-full rounded-lg border py-2.5 pl-3 pr-11 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                onClick={() => setShowNewPassword((isVisible) => !isVisible)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-800"
              >
                {showNewPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              </button>
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Confirm new password</span>
            <span className="relative block">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
                disabled={isChangingPassword}
                className="w-full rounded-lg border py-2.5 pl-3 pr-11 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                onClick={() => setShowConfirmPassword((isVisible) => !isVisible)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-800"
              >
                {showConfirmPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              </button>
            </span>
          </label>

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
            <Link
              to="/app/profile"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isChangingPassword}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isChangingPassword ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}