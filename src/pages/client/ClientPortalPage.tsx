import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ClientIntakePage } from './ClientIntakePage'
import { getClientIntakeHistory, type ClientIntakeRequestPreview } from '../../lib/pm/client-intake'

function statusLabel(status: string | null) {
  const labels: Record<string, string> = {
    backlog: 'Backlog',
    todo: 'Submitted',
    in_progress: 'In progress',
    review: 'In review',
    done: 'Completed',
  }

  return status ? (labels[status] ?? status.replaceAll('_', ' ')) : 'Submitted'
}

function statusClass(status: string | null) {
  if (status === 'done') return 'bg-emerald-100 text-emerald-800'
  if (status === 'in_progress' || status === 'review') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-700'
}

function formatDate(value: string | null) {
  if (!value) return 'Unknown date'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

export function ClientPortalPage() {
  const { token } = useParams<{ token: string }>()
  const [projectName, setProjectName] = useState('Project portal')
  const [requests, setRequests] = useState<ClientIntakeRequestPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadHistory = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError('')
    try {
      const history = await getClientIntakeHistory(token)
      setProjectName(history.project.name)
      setRequests(history.requests)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load request history')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadHistory(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadHistory])

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Client portal</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{projectName}</h1>
          <p className="mt-1 text-sm text-slate-600">Send a request and follow its progress in one place.</p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Your requests</h2>
              <p className="mt-1 text-sm text-slate-500">Status updates from the project team appear here.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {isLoading ? <p className="mt-5 text-sm text-slate-500">Loading requests...</p> : null}
          {error ? <p className="mt-5 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          {!isLoading && !error && requests.length === 0 ? (
            <p className="mt-5 rounded-lg bg-slate-50 px-4 py-5 text-sm text-slate-600">No requests have been submitted yet.</p>
          ) : null}
          {!isLoading && !error && requests.length > 0 ? (
            <div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200">
              {requests.map((request) => (
                <article key={request.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-900">{request.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">Submitted {formatDate(request.submitted_at)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(request.status)}`}>
                    {statusLabel(request.status)}
                  </span>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <ClientIntakePage onSubmitted={() => void loadHistory()} />
      </div>
    </main>
  )
}