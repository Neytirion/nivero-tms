import { useState } from 'react'
import type { TeamInvitation } from './types'

interface TeamStepProps {
  teamInvitations: TeamInvitation[]
  onTeamInvitationsChange: (invitations: TeamInvitation[]) => void
}

export function TeamStep({ teamInvitations, onTeamInvitationsChange }: TeamStepProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'manager' | 'admin'>('member')
  const [emailError, setEmailError] = useState('')

  const isValidEmail = (emailString: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(emailString)
  }

  const handleAddMember = () => {
    const trimmedEmail = email.trim().toLowerCase()

    // Validation
    if (!trimmedEmail) {
      setEmailError('Email is required')
      return
    }

    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Please enter a valid email address')
      return
    }

    // Check for duplicates
    if (teamInvitations.some((inv) => inv.email === trimmedEmail)) {
      setEmailError('This email is already added')
      return
    }

    // Add the invitation
    onTeamInvitationsChange([...teamInvitations, { email: trimmedEmail, role }])

    // Reset form
    setEmail('')
    setRole('member')
    setEmailError('')
  }

  const handleRemoveInvitation = (emailToRemove: string) => {
    onTeamInvitationsChange(teamInvitations.filter((inv) => inv.email !== emailToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddMember()
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Project Team</h2>

      <div className="space-y-4">
        {/* Invitation Form */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900 mb-3">Invite team members by email</p>

          <div className="flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError('')
                }}
                onKeyPress={handleKeyPress}
                placeholder="member@example.com"
                className="flex-1 min-w-[200px] rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />

              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'member' | 'manager' | 'admin')}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              >
                <option value="member">Member</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>

              <button
                type="button"
                onClick={handleAddMember}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                Add
              </button>
            </div>

            {emailError && (
              <p className="text-sm text-red-600">{emailError}</p>
            )}
          </div>
        </div>

        {/* Invited Members List */}
        {teamInvitations.length > 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-900 mb-3">
              Invited members ({teamInvitations.length})
            </p>

            <div className="space-y-2">
              {teamInvitations.map((invitation) => (
                <div
                  key={invitation.email}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{invitation.email}</p>
                    <p className="text-xs text-slate-600 capitalize">{invitation.role}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveInvitation(invitation.email)}
                    className="ml-3 shrink-0 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Info Box */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            ℹ️ Team invitations are optional. You can skip this step or add members after creating the project.
          </p>
        </div>
      </div>
    </div>
  )
}
