import { useMemo } from 'react'
import type { RefObject } from 'react'
import type { ActivityEventPreview, CommentPreview, ProjectMemberListItem } from '../../../../lib/pm'
import { ConfirmDialog } from '../../../../shared/components'

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
    .map((member) => member.email ? `@${member.email.split('@')[0]}` : member.full_name ? `@${member.full_name.toLowerCase().replace(/\s+/g, '.')}` : null)
    .filter(Boolean) as string[]
  if (hints.length === 0) return null
  return (
    <p className="mt-1 text-[11px] text-slate-400">
      Mention teammates: {hints.join(', ')}
    </p>
  )
}

interface ProjectCollaborationCommentsSectionProps {
  isLoading: boolean
  comments: CommentPreview[]
  currentUserId: string | null
  members: ProjectMemberListItem[]
  membersByUserId: Record<string, string>
  lastReadAt: string | null
  commentDraft: string
  onCommentDraftChange: (value: string) => void
  onSubmitComment: () => void
  isSubmittingComment: boolean
  onOpenProfile: (userId: string | null) => void
  onRequestDeleteComment: (comment: CommentPreview) => void
  pendingDeleteComment: CommentPreview | null
  onCancelDeleteComment: () => void
  onConfirmDeleteComment: () => void
  mentionStateByCommentId: Record<string, { id: string; readAt: string | null }>
  commentsEndRef: RefObject<HTMLDivElement | null>
}

export function ProjectCollaborationCommentsSection({
  isLoading,
  comments,
  currentUserId,
  members,
  membersByUserId,
  lastReadAt,
  commentDraft,
  onCommentDraftChange,
  onSubmitComment,
  isSubmittingComment,
  onOpenProfile,
  onRequestDeleteComment,
  pendingDeleteComment,
  onCancelDeleteComment,
  onConfirmDeleteComment,
  mentionStateByCommentId,
  commentsEndRef,
}: ProjectCollaborationCommentsSectionProps) {
  return (
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
          comments.map((comment) => {
            const isOwn = comment.user_id === currentUserId
            const name = getActorLabel(comment.user_id, membersByUserId)
            const initials = name.slice(0, 2).toUpperCase()
            const isUnread = lastReadAt ? comment.created_at > lastReadAt && !isOwn : false
            const mentionState = mentionStateByCommentId[comment.id]
            const isMentioned = Boolean(mentionState)
            const isUnreadMention = Boolean(mentionState && !mentionState.readAt)

            return (
              <div key={comment.id} className={`group flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {!isOwn && (
                  <button
                    type="button"
                    onClick={() => onOpenProfile(comment.user_id)}
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500 transition hover:bg-slate-200"
                    title="Open member profile"
                  >
                    {initials}
                  </button>
                )}
                <div className={`min-w-0 max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isOwn && (
                    <div className="mb-0.5 flex items-baseline gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenProfile(comment.user_id)}
                        className="text-[11px] font-semibold text-slate-600 underline-offset-2 hover:text-cyan-700 hover:underline"
                      >
                        {name}
                      </button>
                      <span className="text-[10px] text-slate-400">{timeAgo(comment.created_at)}</span>
                      {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                      {isMentioned && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                          isUnreadMention ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-700'
                        }`}>
                          Mentioned you
                        </span>
                      )}
                    </div>
                  )}
                  <div className={`relative rounded-2xl px-3 py-1.5 text-sm ${isOwn ? 'rounded-tr-sm bg-slate-900 text-white' : 'rounded-tl-sm bg-slate-100 text-slate-800'}`}>
                    <CommentText message={comment.message} />
                    {isOwn && (
                      <button
                        type="button"
                        onClick={() => onRequestDeleteComment(comment)}
                        className="absolute -left-6 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-300 opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                        title="Delete"
                      >
                        <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M6 2h4a1 1 0 0 1 1 1H5a1 1 0 0 1 1-1ZM3 4h10l-1 10H4L3 4Zm3 2v6h1V6H6Zm3 0v6h1V6H9Z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {isOwn && <span className="mt-0.5 text-[10px] text-slate-400">{timeAgo(comment.created_at)}</span>}
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
          onChange={(event) => onCommentDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void onSubmitComment()
            }
          }}
          placeholder="Write a comment… (Enter to send, Shift+Enter for new line)"
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <MentionHints members={members} />
          <button
            type="button"
            onClick={() => void onSubmitComment()}
            disabled={isSubmittingComment || !commentDraft.trim()}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {isSubmittingComment ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteComment)}
        title="Delete comment"
        description="Are you sure you want to delete this comment?"
        confirmText="Delete"
        tone="danger"
        onCancel={onCancelDeleteComment}
        onConfirm={onConfirmDeleteComment}
      />
    </div>
  )
}

interface ProjectCollaborationWikiSectionProps {
  canEdit: boolean
  isLoading: boolean
  wikiTitle: string
  wikiContent: string
  wikiDraft: string
  isEditingWiki: boolean
  isSavingWiki: boolean
  onWikiDraftChange: (value: string) => void
  onStartEditing: () => void
  onCancelEditing: () => void
  onSaveWiki: () => void
}

export function ProjectCollaborationWikiSection({
  canEdit,
  isLoading,
  wikiTitle,
  wikiContent,
  wikiDraft,
  isEditingWiki,
  isSavingWiki,
  onWikiDraftChange,
  onStartEditing,
  onCancelEditing,
  onSaveWiki,
}: ProjectCollaborationWikiSectionProps) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Project knowledge, decisions, links, and runbooks.</p>
        <div className="flex gap-1.5">
          {isEditingWiki ? (
            <>
              <button type="button" onClick={onCancelEditing} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onSaveWiki()}
                disabled={isSavingWiki || wikiDraft === wikiContent}
                className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {isSavingWiki ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : canEdit ? (
            <button type="button" onClick={onStartEditing} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
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
          <textarea
            value={wikiDraft}
            onChange={(event) => onWikiDraftChange(event.target.value)}
            disabled={isSavingWiki}
            placeholder="Write project knowledge, decisions, links, and runbooks…"
            className="mt-3 w-full h-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:opacity-60"
          />
        ) : wikiContent ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{wikiContent}</p>
        ) : (
          <p className="mt-3 text-sm italic text-slate-400">No wiki content yet.{canEdit ? ' Click Edit to start.' : ''}</p>
        )}
        <p className="mt-3 text-[11px] text-slate-400">Title: {wikiTitle}</p>
      </div>
    </div>
  )
}

interface ProjectCollaborationActivitySectionProps {
  isLoading: boolean
  events: ActivityEventPreview[]
  membersByUserId: Record<string, string>
  currentActivityPage: number
  onCurrentActivityPageChange: (page: number) => void
  activityItemsPerPage: number
  onOpenProfile: (userId: string | null) => void
}

export function ProjectCollaborationActivitySection({
  isLoading,
  events,
  membersByUserId,
  currentActivityPage,
  onCurrentActivityPageChange,
  activityItemsPerPage,
  onOpenProfile,
}: ProjectCollaborationActivitySectionProps) {
  const paginatedEvents = useMemo(() => {
    const startIdx = (currentActivityPage - 1) * activityItemsPerPage
    return events.slice(startIdx, startIdx + activityItemsPerPage)
  }, [activityItemsPerPage, currentActivityPage, events])

  return (
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
          paginatedEvents.map((event) => (
            <div key={event.id} className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => onOpenProfile(event.actor_user_id)}
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-200"
                title="Open member profile"
              >
                {getActorLabel(event.actor_user_id, membersByUserId).slice(0, 2).toUpperCase()}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-800">
                  <button
                    type="button"
                    onClick={() => onOpenProfile(event.actor_user_id)}
                    className="font-semibold text-slate-900 underline-offset-2 hover:text-cyan-700 hover:underline"
                  >
                    {getActorLabel(event.actor_user_id, membersByUserId)}
                  </button>
                  {' '}{formatActivityLabel(event)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(event.created_at)}</p>
              </div>
            </div>
          ))
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
              onClick={() => onCurrentActivityPageChange(Math.max(1, currentActivityPage - 1))}
              disabled={currentActivityPage === 1}
              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onCurrentActivityPageChange(currentActivityPage + 1)}
              disabled={currentActivityPage * activityItemsPerPage >= events.length}
              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
