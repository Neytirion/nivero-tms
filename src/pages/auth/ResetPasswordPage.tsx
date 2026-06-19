import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('Validating recovery link...')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let isMounted = true

    const prepareRecoverySession = async () => {
      const queryParams = new URLSearchParams(window.location.search)
      const callbackCode = queryParams.get('code')

      if (callbackCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)

        if (!isMounted) {
          return
        }

        if (error) {
          setStatus(`Recovery link error: ${error.message}`)
          setIsReady(false)
          return
        }
      }

      const { data, error } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (error || !data.session?.user) {
        setStatus('Recovery link is invalid or expired. Request a new one.')
        setIsReady(false)
        return
      }

      setStatus('Enter a new password for your account.')
      setIsReady(true)
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    void prepareRecoverySession()

    return () => {
      isMounted = false
    }
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isReady) {
      setStatus('Recovery session is not ready. Open the recovery link from your email again.')
      return
    }

    if (!password || password.length < 6) {
      setStatus('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setStatus('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setStatus('Updating password...')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setStatus(`Password update error: ${error.message}`)
      setIsSubmitting(false)
      return
    }

    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      setStatus('Password updated, but sign out failed. Please sign out manually.')
      setIsSubmitting(false)
      return
    }

    setPassword('')
    setConfirmPassword('')
    setStatus('Password updated successfully. You can now sign in with your new password.')
    setIsSubmitting(false)
    setIsReady(false)
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
      <section className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg border border-slate-200">
        <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
          Password Recovery
        </span>

        <h1 className="mt-3 text-lg font-bold text-black">Create a new password</h1>
        <p className="mt-2 text-sm text-slate-600">{status}</p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            minLength={6}
            required
            disabled={!isReady || isSubmitting}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            minLength={6}
            required
            disabled={!isReady || isSubmitting}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <button
            type="submit"
            disabled={!isReady || isSubmitting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Updating...' : 'Update password'}
          </button>
        </form>

        <div className="mt-4">
          <Link
            to="/auth"
            className="text-xs font-medium text-sky-700 transition hover:text-sky-600"
          >
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  )
}
