import { useEffect, useMemo, useRef, useState } from 'react'
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

interface MentionCandidate {
  handle: string
  label: string
}

function normalizeMentionValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
}

function extractMentionQuery(value: string, cursor: number) {
  const beforeCursor = value.slice(0, cursor)
  const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9._-]{0,64})$/)

  if (!match) {
    return null
  }

  const query = match[1] ?? ''
  const start = beforeCursor.lastIndexOf('@')
  if (start < 0) {
    return null
  }

  return {
    start,
    end: cursor,
    query,
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export function TaskCommentsPanel({ projectId, taskId, readOnly = false, onCommentsCountChange }: TaskCommentsPanelProps) {
  const [comments, setComments] = useState<CommentPreview[]>([])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mentionHints, setMentionHints] = useState<string[]>([])
  const [mentionCandidates, setMentionCandidates] = useState<MentionCandidate[]>([])
  const [authorLabelByUserId, setAuthorLabelByUserId] = useState<Record<string, string>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [mentionStateByCommentId, setMentionStateByCommentId] = useState<Record<string, { id: string; readAt: string | null }>>({})
  const [mentionQueryState, setMentionQueryState] = useState<{ start: number; end: number; query: string } | null>(null)
  const [activeMentionIndex, setActiveMentionIndex] = useState(0)
  const messageInputRef = useRef<HTMLInputElement>(null)

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

        const candidates = members.flatMap<MentionCandidate>((member) => {
          const uniqueHandles = new Set<string>()

          if (member.email) {
            const localPart = normalizeMentionValue(member.email.split('@')[0] ?? '')
            if (localPart) {
              uniqueHandles.add(localPart)
            }
          }

          if (member.full_name) {
            const normalizedName = normalizeMentionValue(member.full_name)
            if (normalizedName) {
              uniqueHandles.add(normalizedName)
              uniqueHandles.add(normalizedName.replace(/\./g, ''))
            }
          }

          const label = member.full_name ?? member.email ?? member.user_id ?? 'User'
          return Array.from(uniqueHandles).map((handle) => ({ handle, label }))
        })

        const dedupedCandidates = Array.from(
          candidates.reduce((acc, candidate) => {
            if (!acc.has(candidate.handle)) {
              acc.set(candidate.handle, candidate)
            }
            return acc
          }, new Map<string, MentionCandidate>()).values(),
        )
        setMentionCandidates(dedupedCandidates)
      } catch {
        setAuthorLabelByUserId({})
        setMentionHints([])
        setMentionCandidates([])
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
      setMentionQueryState(null)
      await loadComments()
    } catch {
      setIsLoading(false)
    }
  }

  const filteredMentionCandidates = useMemo(() => {
    if (!mentionQueryState) {
      return [] as MentionCandidate[]
    }

    const normalizedQuery = normalizeMentionValue(mentionQueryState.query)
    const maxItems = 6

    if (!normalizedQuery) {
      return mentionCandidates.slice(0, maxItems)
    }

    return mentionCandidates
      .filter((candidate) => candidate.handle.startsWith(normalizedQuery))
      .slice(0, maxItems)
  }, [mentionCandidates, mentionQueryState])

  const applyMentionCandidate = (candidate: MentionCandidate) => {
    if (!mentionQueryState) {
      return
    }

    const before = message.slice(0, mentionQueryState.start)
    const after = message.slice(mentionQueryState.end)
    const inserted = `@${candidate.handle} `
    const nextMessage = `${before}${inserted}${after}`
    const nextCursor = before.length + inserted.length

    setMessage(nextMessage)
    setMentionQueryState(null)
    setActiveMentionIndex(0)

    requestAnimationFrame(() => {
      const input = messageInputRef.current
      if (!input) {
        return
      }

      input.focus()
      input.setSelectionRange(nextCursor, nextCursor)
    })
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
        <div className="relative mt-2 flex gap-1">
          <input
            ref={messageInputRef}
            type="text"
            value={message}
            onChange={(event) => {
              const nextValue = event.target.value
              const cursor = event.target.selectionStart ?? nextValue.length
              setMessage(nextValue)
              setMentionQueryState(extractMentionQuery(nextValue, cursor))
              setActiveMentionIndex(0)
            }}
            onClick={(event) => {
              const input = event.currentTarget
              const cursor = input.selectionStart ?? input.value.length
              setMentionQueryState(extractMentionQuery(input.value, cursor))
            }}
            onKeyDown={(event) => {
              if (filteredMentionCandidates.length === 0) {
                return
              }

              if (event.key === 'Tab') {
                event.preventDefault()
                const direction = event.shiftKey ? -1 : 1
                const nextIndex = (activeMentionIndex + direction + filteredMentionCandidates.length) % filteredMentionCandidates.length
                setActiveMentionIndex(nextIndex)
                return
              }

              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActiveMentionIndex((prev) => (prev + 1) % filteredMentionCandidates.length)
                return
              }

              if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActiveMentionIndex((prev) => (prev - 1 + filteredMentionCandidates.length) % filteredMentionCandidates.length)
                return
              }

              if (event.key === 'Enter') {
                event.preventDefault()
                const candidate = filteredMentionCandidates[activeMentionIndex] ?? filteredMentionCandidates[0]
                if (candidate) {
                  applyMentionCandidate(candidate)
                }
              }
            }}
            onBlur={() => {
              setTimeout(() => {
                setMentionQueryState(null)
                setActiveMentionIndex(0)
              }, 100)
            }}
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

          {filteredMentionCandidates.length > 0 ? (
            <div className="absolute bottom-full left-0 z-20 mb-1 w-[calc(100%-56px)] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
              {filteredMentionCandidates.map((candidate, index) => {
                const isActive = index === activeMentionIndex
                return (
                  <button
                    key={`${candidate.handle}-${index}`}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      applyMentionCandidate(candidate)
                    }}
                    className={`flex w-full items-center justify-between px-2 py-1.5 text-left text-xs ${
                      isActive ? 'bg-cyan-50 text-cyan-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-semibold">@{candidate.handle}</span>
                    <span className="ml-2 truncate text-[10px] text-slate-500">{candidate.label}</span>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
