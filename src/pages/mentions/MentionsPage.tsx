import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserMentions, markMentionAsRead, type UserMentionPreview } from '../../lib/pm'
import { WorkspacePageHeader } from '../../shared/components'
import { supabase } from '../../lib/supabase'

function formatTime(value: string) {
  return new Date(value).toLocaleString()
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
          navigate(`/app/tasks/${taskRow.id}`, {
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
      <WorkspacePageHeader
        eyebrow="Inbox"
        title="Mentions"
        description="Where teammates mentioned you in tasks and project chat."
        actions={(
          <>
            <button
              type="button"
              onClick={() => setShowOnlyUnread((prev) => !prev)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showOnlyUnread ? 'Show all' : 'Show unread only'}
            </button>
            <button
              type="button"
              onClick={() => void markAllVisibleAsRead()}
              disabled={isMarkingAllRead || unreadMentions.length === 0}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {isMarkingAllRead ? 'Marking…' : 'Mark visible as read'}
            </button>
          </>
        )}
        badges={[
          { label: `${unreadMentions.length} unread`, tone: 'neutral' },
          { label: showOnlyUnread ? 'Unread filter' : 'All mentions', tone: 'cyan' },
        ]}
      />

      {statusMessage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {statusMessage}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : visibleMentions.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No mentions found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
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
                  className={`w-full flex flex-wrap items-start justify-between gap-3 p-4 text-left transition hover:bg-slate-50 ${
                    isOpening ? 'opacity-50' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{item.project?.name ?? 'Project'}</span>
                      <span>•</span>
                      <span>{isTaskMention ? 'Task comment' : 'Project chat'}</span>
                      <span>•</span>
                      <span>{formatTime(item.mention.created_at)}</span>
                      {isUnread ? (
                        <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">Unread</span>
                      ) : null}
                    </div>

                    {isTaskMention ? (
                      <p className="mb-1 text-xs font-medium text-slate-600">
                        Task: {item.taskTitle ?? 'Task was removed'}
                      </p>
                    ) : null}

                    <p className="line-clamp-2 text-sm text-slate-800">{item.comment.message}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isUnread ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          void markSingleMentionAsRead(item.mention.id)
                        }}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
