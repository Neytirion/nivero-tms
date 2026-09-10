import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, AtSign, Check, CheckCheck, Inbox, MessageSquare, Settings2 } from 'lucide-react'
import { getUserMentions, markMentionAsRead, type UserMentionPreview } from '../../lib/pm'
import { supabase } from '../../lib/supabase'

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function MentionsPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)
  const [openingMentionId, setOpeningMentionId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [mentions, setMentions] = useState<UserMentionPreview[]>([])
  const [showOnlyUnread, setShowOnlyUnread] = useState(true)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const loadMentions = async () => {
    setIsLoading(true)
    try {
      const { data } = await supabase.auth.getUser()
      const userId = data.user?.id ?? null
      setCurrentUserId(userId)

      if (!userId) {
        setMentions([])
        return
      }

      const result = await getUserMentions(userId, 200)
      setMentions(result)
    } catch {
      setMentions([])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    const onFocus = () => {
      void loadMentions()
    }

    const loadTimerId = window.setTimeout(onFocus, 0)

    window.addEventListener('focus', onFocus)
    return () => {
      window.clearTimeout(loadTimerId)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const unreadMentions = useMemo(
    () => mentions.filter((item) => !item.mention.read_at),
    [mentions],
  )

  const visibleMentions = useMemo(
    () => showOnlyUnread ? unreadMentions : mentions,
    [mentions, showOnlyUnread, unreadMentions],
  )

  const markSingleMentionAsRead = async (mentionId: string) => {
    if (!currentUserId) {
      return
    }

    try {
      const updated = await markMentionAsRead({ mentionId, userId: currentUserId })
      if (!updated) {
        return
      }

      const now = new Date().toISOString()
      setMentions((prev) => prev.map((item) =>
        item.mention.id === mentionId
          ? { ...item, mention: { ...item.mention, read_at: now } }
          : item,
      ))
      window.dispatchEvent(new Event('mentions:changed'))
    } catch {
      // Keep page responsive even if one item fails to update.
    }
  }

  const markAllVisibleAsRead = async () => {
    if (!currentUserId) {
      return
    }

    const target = visibleMentions.filter((item) => !item.mention.read_at)
    if (target.length === 0) {
      return
    }

    setIsMarkingAllRead(true)
    try {
      await Promise.all(target.map((item) => markMentionAsRead({ mentionId: item.mention.id, userId: currentUserId })))

      const now = new Date().toISOString()
      const targetIds = new Set(target.map((item) => item.mention.id))
      setMentions((prev) => prev.map((item) =>
        targetIds.has(item.mention.id)
          ? { ...item, mention: { ...item.mention, read_at: now } }
          : item,
      ))
      window.dispatchEvent(new Event('mentions:changed'))
    } finally {
      setIsMarkingAllRead(false)
    }
  }

  const openMention = async (item: UserMentionPreview) => {
    setStatusMessage(null)
    setOpeningMentionId(item.mention.id)

    try {
      const { data: commentRow, error: commentError } = await supabase
        .from('comments')
        .select('id,project_id,task_id')
        .eq('id', item.mention.comment_id)
        .maybeSingle()

      if (commentError || !commentRow) {
        setMentions((prev) => prev.filter((entry) => entry.mention.id !== item.mention.id))
        setStatusMessage('This mention points to a deleted message and was removed from the list.')
        return
      }

      if (commentRow.task_id) {
        const { data: taskRow, error: taskError } = await supabase
          .from('tasks')
          .select('id')
          .eq('id', commentRow.task_id)
          .maybeSingle()

        if (!taskError && taskRow) {
          navigate(`/app/tasks/${taskRow.id}?projectId=${commentRow.project_id}`, {
            state: { backTo: `/app/projects/${commentRow.project_id}?tab=collaboration` },
          })
          return
        }
      }

      navigate(`/app/projects/${commentRow.project_id}?tab=collaboration`)
    } finally {
      setOpeningMentionId(null)
    }
  }

  return (
    <div className="space-y-4">
      {statusMessage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {statusMessage}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600">
              <Inbox className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">Mention inbox</h2>
              <p className="text-xs text-slate-500">
                {unreadMentions.length === 0 ? 'You are all caught up' : `${unreadMentions.length} conversation${unreadMentions.length === 1 ? '' : 's'} need your attention`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white p-0.5" aria-label="Mention filter">
              <button
                type="button"
                onClick={() => setShowOnlyUnread(true)}
                aria-pressed={showOnlyUnread}
                className={`h-7 rounded px-2.5 text-xs font-semibold transition-colors ${showOnlyUnread ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {showOnlyUnread ? 'Unread only' : 'Show unread only'}
              </button>
              <button
                type="button"
                onClick={() => setShowOnlyUnread(false)}
                aria-pressed={!showOnlyUnread}
                className={`h-7 rounded px-2.5 text-xs font-semibold transition-colors ${!showOnlyUnread ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Show all
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/mentions/settings')}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
              Notification settings
            </button>
            <button
              type="button"
              onClick={() => void markAllVisibleAsRead()}
              disabled={isMarkingAllRead || unreadMentions.length === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {isMarkingAllRead ? 'Marking...' : 'Mark visible as read'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4" aria-label="Loading mentions">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex gap-3">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-md bg-slate-100" />
                <div className="flex-1 space-y-2 py-0.5">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleMentions.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Check className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-slate-900">{showOnlyUnread ? 'You are all caught up' : 'No mentions yet'}</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {showOnlyUnread ? 'New mentions will appear here when a teammate needs your attention.' : 'Mentions from project and task conversations will appear here.'}
            </p>
            {showOnlyUnread && mentions.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowOnlyUnread(false)}
                className="mt-4 text-xs font-semibold text-cyan-700 hover:text-cyan-900"
              >
                Show read mentions
              </button>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {visibleMentions.map((item) => {
              const isUnread = !item.mention.read_at
              const isTaskMention = Boolean(item.mention.task_id)
              const isOpening = openingMentionId === item.mention.id

              return (
                <div
                  key={item.mention.id}
                  role="button"
                  tabIndex={isOpening ? -1 : 0}
                  onClick={() => void openMention(item)}
                  onKeyDown={(event) => {
                    if (isOpening) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      void openMention(item)
                    }
                  }}
                  aria-disabled={isOpening}
                  className={`group relative flex w-full flex-wrap items-start justify-between gap-3 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-600 ${
                    isUnread ? 'bg-cyan-50/35 hover:bg-cyan-50/70' : 'hover:bg-slate-50'
                  } ${isOpening ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  {isUnread ? <span className="absolute inset-y-0 left-0 w-0.5 bg-cyan-600" aria-hidden="true" /> : null}

                  <div className="flex min-w-0 flex-1 gap-3">
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${isUnread ? 'border-cyan-200 bg-white text-cyan-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                      {isTaskMention ? <AtSign className="h-4 w-4" aria-hidden="true" /> : <MessageSquare className="h-4 w-4" aria-hidden="true" />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span className={`font-semibold ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>{item.project?.name ?? 'Project'}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />
                        <span>{isTaskMention ? item.taskTitle ?? 'Removed task' : 'Project conversation'}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />
                        <time dateTime={item.mention.created_at}>{formatTime(item.mention.created_at)}</time>
                        {isUnread ? <span className="sr-only">Unread</span> : null}
                      </div>

                      <p className={`line-clamp-3 text-sm leading-5 ${isUnread ? 'font-medium text-slate-900' : 'text-slate-700'}`}>
                        {item.comment.message}
                      </p>
                    </div>
                  </div>

                  <div className="ml-12 flex items-center gap-1 sm:ml-0">
                    {isUnread ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          void markSingleMentionAsRead(item.mention.id)
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Mark read
                      </button>
                    ) : null}
                    <ArrowUpRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-700" aria-hidden="true" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
