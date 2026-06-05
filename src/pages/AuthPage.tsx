import { useAuthForm } from '../features/auth/useAuthForm.ts'

export function AuthPage() {
  const {
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
  } = useAuthForm()

  return (
    <main className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
      <section className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg border border-slate-200">
        <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
          Authentication
        </span>

        <h1 className="mt-3 text-lg font-bold text-black">
          Welcome to Nivero PM
        </h1>
        <p className="mt-2 text-sm text-slate-600">{status}</p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('sign-in')}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              mode === 'sign-in' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('sign-up')}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              mode === 'sign-up' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          {mode === 'sign-up' ? (
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Name (optional)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
            />
          ) : null}

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
          />

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
            minLength={6}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? mode === 'sign-up'
                ? 'Creating account...'
                : 'Signing in...'
              : mode === 'sign-up'
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}
