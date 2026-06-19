import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('Enter your account email to receive a password reset link.')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email) {
      setStatus('Please enter your email.')
      return
    }

    setIsSubmitting(true)
    setStatus('Sending recovery email...')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      setStatus(`Recovery error: ${error.message}`)
      setIsSubmitting(false)
      return
    }

    setStatus('If this email is registered, a recovery link has been sent.')
    setIsSubmitting(false)
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
      <section className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg border border-slate-200">
        <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
          Password Recovery
        </span>

        <h1 className="mt-3 text-lg font-bold text-black">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-600">{status}</p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Sending...' : 'Send reset link'}
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
