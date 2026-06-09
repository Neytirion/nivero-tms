import { useEffect, useState } from 'react'
import { createTaskComment, getProjectMembers, getTaskComments, type CommentPreview } from '../../../../lib/pm'

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

  const loadComments = async () => {
    setIsLoading(true)
    try {
      const data = await getTaskComments(taskId)
      setComments(data)
      onCommentsCountChange?.(data.length)
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
  }, [taskId])

  useEffect(() => {
    const loadMentionHints = async () => {
      try {
        const members = await getProjectMembers(projectId)
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

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Comments</p>

      <div className="mt-2 space-y-1.5">
        {comments.length === 0 ? <p className="text-xs text-slate-500">No comments yet</p> : null}
        {comments.slice(-3).map((item) => (
          <div key={item.id} className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
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
