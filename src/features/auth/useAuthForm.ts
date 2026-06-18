import { useEffect, useRef, useState } from 'react'
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
            emailRedirectTo: `${window.location.origin}/auth`,
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
        const normalizedMessage = error.message.toLowerCase()
        const normalizedCode = (error.code ?? '').toLowerCase()

        if (
          normalizedCode.includes('email_not_confirmed') ||
          normalizedMessage.includes('email not confirmed')
        ) {
          setStatus('Please confirm your email before signing in. Check your inbox.')
          return
        }

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

      const { data: oauthData, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          skipBrowserRedirect: true,
        },
      })

      if (error) {
        const normalizedMessage = error.message.toLowerCase()

        if (normalizedMessage.includes('unsupported provider') || normalizedMessage.includes('provider is not enabled')) {
          setStatus('Google sign-in is not enabled in Supabase yet. Enable Google provider in Auth settings.')
          return
        }

        setStatus(`Google sign-in error: ${error.message}`)
        return
      }

      if (!oauthData?.url) {
        setStatus('Google sign-in error: failed to prepare OAuth redirect URL.')
        return
      }

      window.location.assign(oauthData.url)
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const handleOAuthCallback = async () => {
      const queryParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '')
      const callbackCode = queryParams.get('code')
      const callbackError = queryParams.get('error_description') ?? hashParams.get('error_description')

      if (callbackError) {
        setStatus(`Auth error: ${callbackError}`)
        return
      }

      if (!callbackCode || isSubmittingRef.current) {
        return
      }

      isSubmittingRef.current = true
      setIsSubmitting(true)
      setStatus('Completing sign-in...')

      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)

      if (!isMounted) {
        return
      }

      if (error) {
        setStatus(`Google callback error: ${error.message}`)
      } else {
        setStatus('Signed in with Google. Redirecting...')
      }

      window.history.replaceState({}, document.title, window.location.pathname)
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }

    void handleOAuthCallback()

    return () => {
      isMounted = false
    }
  }, [])

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
