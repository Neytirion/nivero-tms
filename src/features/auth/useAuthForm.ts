import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

export type AuthMode = 'sign-in' | 'sign-up'

export function useAuthForm() {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [status, setStatus] = useState('Sign in or create a new account')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isAlreadyRegisteredError = (message: string, code?: string) => {
    const normalizedMessage = message.toLowerCase()
    const normalizedCode = (code ?? '').toLowerCase()

    return (
      normalizedCode.includes('user_already') ||
      normalizedMessage.includes('already registered') ||
      normalizedMessage.includes('already been registered') ||
      normalizedMessage.includes('user already exists')
    )
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email || !password) {
      setStatus('Please provide email and password')
      return
    }

    setIsSubmitting(true)

    if (mode === 'sign-up') {
      setStatus('Creating account...')

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        if (isAlreadyRegisteredError(error.message, error.code)) {
          setStatus('This email is already registered. Please sign in.')
          setMode('sign-in')
          setIsSubmitting(false)
          return
        }

        setStatus(`Sign up error: ${error.message}`)
        setIsSubmitting(false)
        return
      }

      setPassword('')

      setStatus(`Account created for ${data.user?.email ?? 'user'}. Redirecting...`)
      setIsSubmitting(false)
      return
    }

    setStatus('Signing in...')
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setStatus(`Sign in error: ${error.message}`)
      setIsSubmitting(false)
      return
    }

    setStatus('Signed in. Redirecting...')
    setIsSubmitting(false)
  }

  return {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    status,
    isSubmitting,
    submit,
  }
}
