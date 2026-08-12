import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createProjectComment,
  deleteComment,
  getProjectActivityEvents,
  getProjectComments,
  getProjectMembers,
  getProjectWikiPage,
  saveProjectWikiPage,
  type ActivityEventPreview,
  type CommentPreview,
  type ProjectMemberListItem,
} from '../../../../lib/pm'
import { supabase } from '../../../../lib/supabase'
import { ConfirmDialog } from '../../../../shared/components'
import { ProjectDocumentsTab } from './ProjectDocumentsTab'

interface ProjectCollaborationTabProps {
  projectId: string
  canEdit: boolean
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function getActorLabel(userId: string | null, map: Record<string, string>) {
  if (!userId) return 'System'
  return map[userId] ?? userId
}

function formatActivityLabel(event: ActivityEventPreview) {
  switch (event.event_type) {
    case 'comment.created': return 'added a comment'
    case 'comment.mentioned': return 'mentioned a teammate'
    case 'document.uploaded': return 'uploaded a document'
    case 'wiki.updated': return 'updated the wiki'
    default: return event.event_type
  }
}

/** Highlights @mentions in comment text */
function CommentText({ message }: { message: string }) {
  const parts = message.split(/((?:^|\s)@[a-zA-Z0-9._-]{2,64})/g)
  return (
    <span>
      {parts.map((part, i) =>
        part.trimStart().startsWith('@') ? (
          <span key={i} className="rounded bg-blue-50 px-0.5 font-medium text-blue-700">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  )
}

function MentionHints({ members }: { members: ProjectMemberListItem[] }) {
  if (members.length === 0) return null
  const hints = members
    .slice(0, 6)
    .map((m) => m.email ? `@${m.email.split('@')[0]}` : m.full_name ? `@${m.full_name.toLowerCase().replace(/\s+/g, '.')}` : null)
    .filter(Boolean) as string[]
  if (hints.length === 0) return null
  return (
    <p className="mt-1 text-[11px] text-slate-400">
      Mention teammates: {hints.join(', ')}
    </p>
  )
}

export function ProjectCollaborationTab({ projectId, canEdit }: ProjectCollaborationTabProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [members, setMembers] = useState<ProjectMemberListItem[]>([])
  const [events, setEvents] = useState<ActivityEventPreview[]>([])
  const [comments, setComments] = useState<CommentPreview[]>([])
  const [pendingDeleteComment, setPendingDeleteComment] = useState<CommentPreview | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [wikiTitle, setWikiTitle] = useState('Project Wiki')
  const [wikiContent, setWikiContent] = useState('')
  const [wikiDraft, setWikiDraft] = useState('')
  const [isEditingWiki, setIsEditingWiki] = useState(false)
  const [isSavingWiki, setIsSavingWiki] = useState(false)
  const [lastReadAt, setLastReadAt] = useState<string | null>(() =>
    localStorage.getItem(`collab_lastRead_${projectId}`),
  )
  const [currentActivityPage, setCurrentActivityPage] = useState(1)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const activityItemsPerPage = 10

  const membersByUserId = useMemo(
    () => members.reduce<Record<string, string>>((acc, m) => {
      if (m.user_id) acc[m.user_id] = m.full_name ?? m.email ?? m.user_id
      return acc
    }, {}),
    [members],
  )

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [{ data: authData }, wiki, activityEvents, projectMembers, projectComments] = await Promise.all([
        supabase.auth.getUser(),
        getProjectWikiPage(projectId),
        getProjectActivityEvents(projectId, 40),
        getProjectMembers(projectId),
        getProjectComments(projectId),
      ])
      setCurrentUserId(authData.user?.id ?? null)
      setEvents(activityEvents)
      setMembers(projectMembers)
      setComments(projectComments)
      if (wiki) { setWikiTitle(wiki.title); setWikiContent(wiki.content); setWikiDraft(wiki.content) }
      else { setWikiTitle('Project Wiki'); setWikiContent(''); setWikiDraft('') }
    } catch (error) {
      console.error('Collaboration load error:', error)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const deleteCommentHandler = async () => {
    if (!pendingDeleteComment) {
      return
    }

    try {
      await deleteComment(pendingDeleteComment.id)
      setComments((prev) => prev.filter((c) => c.id !== pendingDeleteComment.id))
    } catch (error) {
      console.error('Delete comment error:', error)
    }

    setPendingDeleteComment(null)
  }

  const submitComment = async () => {
    const message = commentDraft.trim()
    if (!message) return
    setIsSubmittingComment(true)
    try {
      const created = await createProjectComment({ projectId, message })
      setComments((prev) => [...prev, created])
      setCommentDraft('')
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (error) {
      console.error('Comment error:', error)
    }
    setIsSubmittingComment(false)
  }

  const saveWiki = async () => {
    if (!canEdit) return
    setIsSavingWiki(true)
    try {
      await saveProjectWikiPage({ projectId, title: wikiTitle, content: wikiDraft })
      setWikiContent(wikiDraft)
      setIsEditingWiki(false)
    } catch (error) {
      console.error('Wiki save error:', error)
    }
    setIsSavingWiki(false)
  }

  const [activeSection, setActiveSection] = useState<'comments' | 'wiki' | 'files' | 'activity'>('comments')

  const unreadCount = lastReadAt
    ? comments.filter((c) => c.created_at > lastReadAt && c.user_id !== currentUserId).length
    : 0

  const markAsRead = () => {
    const now = new Date().toISOString()
    localStorage.setItem(`collab_lastRead_${projectId}`, now)
    setLastReadAt(now)
  }

  const handleCommentsTabClick = () => {
    setActiveSection('comments')
    markAsRead()
  }

  return (
    <div className="mt-4">
      {/* Inner sub-nav */}
      <div className="flex gap-1 border-b border-slate-200 pb-0">
        {([
          { key: 'comments', label: 'Comments', count: unreadCount > 0 ? unreadCount : null, isNew: unreadCount > 0 },
          { key: 'wiki',     label: 'Wiki',     count: null, isNew: false },
          { key: 'files',    label: 'Files',    count: null, isNew: false },
          { key: 'activity', label: 'Activity', count: null, isNew: false },
        ] as const).map(({ key, label, count, isNew }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (key === 'comments') {
                handleCommentsTabClick()
              } else {
                if (key === 'activity') setCurrentActivityPage(1)
                setActiveSection(key)
              }
            }}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              activeSection === key
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
            {count != null && count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                isNew ? 'bg-blue-600 text-white' : activeSection === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col" style={{ height: 'calc(100vh - 300px)' }}>
        {/* Comments */}
        {activeSection === 'comments' && (
          <div className="relative flex flex-1 flex-col rounded-xl border border-slate-200 bg-white">
            <div className="flex-1 overflow-y-auto space-y-2 p-3 pb-48">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-2.5">
                      <div className="h-6 w-6 animate-pulse rounded-full bg-slate-200" />
                      <div className="flex-1 space-y-1 pt-1">
                        <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-200" />
                        <div className="h-2.5 w-2/3 animate-pulse rounded bg-slate-200" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-slate-400">No comments yet.</p>
              ) : (
                comments.map((c) => {
                  const isOwn = c.user_id === currentUserId
                  const name = getActorLabel(c.user_id, membersByUserId)
                  const initials = name.slice(0, 2).toUpperCase()
                  const isUnread = lastReadAt ? c.created_at > lastReadAt && !isOwn : false
                  return (
                    <div key={c.id} className={`group flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {!isOwn && (
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">
                          {initials}
                        </span>
                      )}
                      <div className={`min-w-0 max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isOwn && (
                          <div className="mb-0.5 flex items-baseline gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-600">{name}</span>
                            <span className="text-[10px] text-slate-400">{timeAgo(c.created_at)}</span>
                            {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                          </div>
                        )}
                        <div className={`relative rounded-2xl px-3 py-1.5 text-sm ${
                          isOwn
                            ? 'rounded-tr-sm bg-slate-900 text-white'
                            : 'rounded-tl-sm bg-slate-100 text-slate-800'
                        }`}>
                          <CommentText message={c.message} />
                          {isOwn && (
                            <button
                              type="button"
                              onClick={() => setPendingDeleteComment(c)}
                              className="absolute -left-6 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-300 opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                              title="Delete"
                            >
                              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M6 2h4a1 1 0 0 1 1 1H5a1 1 0 0 1 1-1ZM3 4h10l-1 10H4L3 4Zm3 2v6h1V6H6Zm3 0v6h1V6H9Z" />
                              </svg>
                            </button>
                          )}
                        </div>
                        {isOwn && <span className="mt-0.5 text-[10px] text-slate-400">{timeAgo(c.created_at)}</span>}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={commentsEndRef} />
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex-shrink-0 border-t border-slate-100 bg-white p-3">
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submitComment() } }}
                placeholder="Write a comment… (Enter to send, Shift+Enter for new line)"
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <MentionHints members={members} />
                <button
                  type="button"
                  onClick={() => void submitComment()}
                  disabled={isSubmittingComment || !commentDraft.trim()}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {isSubmittingComment ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wiki */}
        {activeSection === 'wiki' && (
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Project knowledge, decisions, links, and runbooks.</p>
              <div className="flex gap-1.5">
                {isEditingWiki ? (
                  <>
                    <button type="button" onClick={() => setIsEditingWiki(false)}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      Cancel
                    </button>
                    <button type="button" onClick={() => void saveWiki()}
                      disabled={isSavingWiki || wikiDraft === wikiContent}
                      className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
                      {isSavingWiki ? 'Saving…' : 'Save'}
                    </button>
                  </>
                ) : canEdit ? (
                  <button type="button" onClick={() => { setWikiDraft(wikiContent); setIsEditingWiki(true) }}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    Edit
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-3/5 animate-pulse rounded bg-slate-200" />
                </div>
              ) : isEditingWiki ? (
                <textarea value={wikiDraft} onChange={(e) => setWikiDraft(e.target.value)}
                  disabled={isSavingWiki}
                  placeholder="Write project knowledge, decisions, links, and runbooks…"
                  className="mt-3 w-full h-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:opacity-60" />
              ) : wikiContent ? (
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{wikiContent}</p>
              ) : (
                <p className="mt-3 text-sm italic text-slate-400">No wiki content yet.{canEdit ? ' Click Edit to start.' : ''}</p>
              )}
            </div>
          </div>
        )}

        {/* Files */}
        {activeSection === 'files' && (
          <div className="rounded-xl border border-slate-200 bg-white">
            <ProjectDocumentsTab projectId={projectId} canEdit={canEdit} membersByUserId={membersByUserId} currentUserId={currentUserId} />
          </div>
        )}

        {/* Activity */}
        {activeSection === 'activity' && (
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
            <p className="shrink-0 text-xs text-slate-500">Recent actions in this project</p>
            <div className="mt-3 flex-1 overflow-y-auto space-y-3">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-7 w-7 animate-pulse rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                      <div className="h-2.5 w-1/4 animate-pulse rounded bg-slate-200" />
                    </div>
                  </div>
                ))
              ) : events.length === 0 ? (
                <p className="text-sm text-slate-400">No activity yet</p>
              ) : (
                (() => {
                  const startIdx = (currentActivityPage - 1) * activityItemsPerPage
                  const endIdx = startIdx + activityItemsPerPage
                  const paginatedEvents = events.slice(startIdx, endIdx)
                  return paginatedEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                        {getActorLabel(event.actor_user_id, membersByUserId).slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-800">
                          <span className="font-semibold text-slate-900">{getActorLabel(event.actor_user_id, membersByUserId)}</span>
                          {' '}{formatActivityLabel(event)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(event.created_at)}</p>
                      </div>
                    </div>
                  ))
                })()
              )}
            </div>
            {events.length > activityItemsPerPage && (
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500">
                  {events.length > 0 ? `${Math.min((currentActivityPage - 1) * activityItemsPerPage + 1, events.length)}–${Math.min(currentActivityPage * activityItemsPerPage, events.length)} of ${events.length}` : '0'}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentActivityPage(Math.max(1, currentActivityPage - 1))}
                    disabled={currentActivityPage === 1}
                    className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentActivityPage(currentActivityPage + 1)}
                    disabled={currentActivityPage * activityItemsPerPage >= events.length}
                    className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteComment)}
        title="Delete comment"
        description="Are you sure you want to delete this comment?"
        confirmText="Delete"
        tone="danger"
        onCancel={() => setPendingDeleteComment(null)}
        onConfirm={deleteCommentHandler}
      />
    </div>
  )
}
