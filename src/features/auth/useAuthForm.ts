import { useRef, useState } from 'react'
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
  const isSubmittingRef = useRef(false)

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

    if (isSubmittingRef.current) {
      return
    }

    if (!email || !password) {
      setStatus('Please provide email and password')
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)

    try {
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
            return
          }

          setStatus(`Sign up error: ${error.message}`)
          return
        }

        setPassword('')

        if (data.session) {
          setStatus(`Account created for ${data.user?.email ?? 'user'}. Redirecting...`)
          return
        }

        setMode('sign-in')
        setStatus(`Account created for ${data.user?.email ?? 'user'}. Confirm your email before signing in.`)
        return
      }

      setStatus('Signing in...')
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setStatus(`Sign in error: ${error.message}`)
        return
      }

      setStatus('Signed in. Redirecting...')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const signInWithGoogle = async () => {
    if (isSubmittingRef.current) {
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)

    try {
      setStatus('Redirecting to Google...')

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      })

      if (error) {
        setStatus(`Google sign-in error: ${error.message}`)
        return
      }

      setStatus('Redirecting to Google...')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
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
    signInWithGoogle,
  }
}
