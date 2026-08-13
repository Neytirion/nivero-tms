import { useEffect, useState } from 'react'
import {
  createTaskComment,
  deleteComment,
  getMentionStatesForUserInComments,
  getProjectMembers,
  getTaskComments,
  markMentionsAsReadInComments,
  type CommentPreview,
} from '../../../../lib/pm'
import { supabase } from '../../../../lib/supabase'

interface TaskCommentsPanelProps {
  projectId: string
  taskId: string
  readOnly?: boolean
  onCommentsCountChange?: (count: number) => void
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export function TaskCommentsPanel({ projectId, taskId, readOnly = false, onCommentsCountChange }: TaskCommentsPanelProps) {
  const [comments, setComments] = useState<CommentPreview[]>([])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mentionHints, setMentionHints] = useState<string[]>([])
  const [authorLabelByUserId, setAuthorLabelByUserId] = useState<Record<string, string>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [mentionStateByCommentId, setMentionStateByCommentId] = useState<Record<string, { id: string; readAt: string | null }>>({})

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data } = await supabase.auth.getUser()
      setCurrentUserId(data.user?.id ?? null)
    }

    void loadCurrentUser()
  }, [])

  const loadComments = async () => {
    setIsLoading(true)
    try {
      const data = await getTaskComments(taskId)
      setComments(data)
      onCommentsCountChange?.(data.length)

      if (currentUserId && data.length > 0) {
        const mentionStates = await getMentionStatesForUserInComments({
          projectId,
          userId: currentUserId,
          commentIds: data.map((comment) => comment.id),
        })

        const mentionMap = mentionStates.reduce<Record<string, { id: string; readAt: string | null }>>((acc, item) => {
          acc[item.comment_id] = { id: item.id, readAt: item.read_at }
          return acc
        }, {})
        setMentionStateByCommentId(mentionMap)

        const unreadMentionCommentIds = mentionStates
          .filter((item) => !item.read_at)
          .map((item) => item.comment_id)

        if (unreadMentionCommentIds.length > 0) {
          await markMentionsAsReadInComments({
            projectId,
            userId: currentUserId,
            commentIds: unreadMentionCommentIds,
          })

          const now = new Date().toISOString()
          setMentionStateByCommentId((prev) => {
            const next = { ...prev }
            unreadMentionCommentIds.forEach((commentId) => {
              const mention = next[commentId]
              if (mention) {
                next[commentId] = { ...mention, readAt: now }
              }
            })
            return next
          })
          window.dispatchEvent(new Event('mentions:changed'))
        }
      } else {
        setMentionStateByCommentId({})
      }
    } catch {
      // Keep UI quiet in card context.
    }
    setIsLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadComments()
    // reload when task changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, currentUserId, projectId])

  useEffect(() => {
    const loadMentionHints = async () => {
      try {
        const members = await getProjectMembers(projectId)
        const labels = members.reduce<Record<string, string>>((acc, member) => {
          if (member.user_id) {
            acc[member.user_id] = member.full_name ?? member.email ?? member.user_id
          }
          return acc
        }, {})
        setAuthorLabelByUserId(labels)

        const hints = members
          .map((member) => {
            if (member.email) {
              return `@${member.email.split('@')[0]}`
            }

            if (member.full_name) {
              return `@${member.full_name.toLowerCase().replace(/\s+/g, '.')}`
            }

            return null
          })
          .filter((item): item is string => Boolean(item))
          .slice(0, 4)

        setMentionHints(hints)
      } catch {
        setAuthorLabelByUserId({})
        setMentionHints([])
      }
    }

    void loadMentionHints()
  }, [projectId])

  const addComment = async () => {
    const nextMessage = message.trim()
    if (!nextMessage) {
      return
    }

    setIsLoading(true)
    try {
      await createTaskComment({
        projectId,
        taskId,
        message: nextMessage,
      })
      setMessage('')
      await loadComments()
    } catch {
      setIsLoading(false)
    }
  }

  const removeComment = async (commentId: string) => {
    if (!currentUserId) {
      return
    }

    setIsLoading(true)
    try {
      await deleteComment(commentId)
      await loadComments()
      window.dispatchEvent(new Event('mentions:changed'))
    } catch {
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Comments</p>

      <div className="mt-2 space-y-1.5">
        {comments.length === 0 ? <p className="text-xs text-slate-500">No comments yet</p> : null}
        {comments.slice(-3).map((item) => (
          <div key={item.id} className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {currentUserId && item.user_id === currentUserId
                  ? 'You'
                  : authorLabelByUserId[item.user_id] ?? item.user_id}
              </p>
            </div>
            {currentUserId && item.user_id === currentUserId ? (
              <div className="mb-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => void removeComment(item.id)}
                  disabled={isLoading}
                  className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            ) : null}
            {mentionStateByCommentId[item.id] ? (
              <p className={`mb-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                mentionStateByCommentId[item.id].readAt ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-800'
              }`}>
                Mentioned you
              </p>
            ) : null}
            <p className="text-xs text-slate-700">{item.message}</p>
            <p className="mt-1 text-[10px] text-slate-500">{formatDate(item.created_at)}</p>
          </div>
        ))}
      </div>

      {!readOnly ? (
        <div className="mt-2 flex gap-1">
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={mentionHints.length > 0 ? `Add comment (mentions: ${mentionHints.join(', ')})` : 'Add comment'}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
          />
          <button
            type="button"
            onClick={() => void addComment()}
            disabled={isLoading}
            className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            Send
          </button>
        </div>
      ) : null}
    </div>
  )
}
