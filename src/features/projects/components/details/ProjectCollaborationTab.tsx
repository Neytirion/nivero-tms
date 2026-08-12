import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createProjectComment,
  deleteComment,
  getProjectActivityEvents,
  getProjectComments,
  getProjectMembers,
  getProjectWikiPage,
  saveProjectWikiPage,
  type CommentPreview,
  type ProjectMemberListItem,
} from '../../../../lib/pm'
import { supabase } from '../../../../lib/supabase'
import { ProjectDocumentsTab } from './ProjectDocumentsTab'
import {
  ProjectCollaborationActivitySection,
  ProjectCollaborationCommentsSection,
  ProjectCollaborationWikiSection,
} from './ProjectCollaborationSections'
import { UserProfileDialog } from '../../../../shared/components'

interface ProjectCollaborationTabProps {
  projectId: string
  canEdit: boolean
}

export function ProjectCollaborationTab({ projectId, canEdit }: ProjectCollaborationTabProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [members, setMembers] = useState<ProjectMemberListItem[]>([])
  const [events, setEvents] = useState<Awaited<ReturnType<typeof getProjectActivityEvents>>>([])
  const [comments, setComments] = useState<CommentPreview[]>([])
  const [pendingDeleteComment, setPendingDeleteComment] = useState<CommentPreview | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [wikiTitle, setWikiTitle] = useState('Project Wiki')
  const [wikiContent, setWikiContent] = useState('')
  const [wikiDraft, setWikiDraft] = useState('')
  const [isEditingWiki, setIsEditingWiki] = useState(false)
  const [isSavingWiki, setIsSavingWiki] = useState(false)
  const [activeSection, setActiveSection] = useState<'comments' | 'wiki' | 'files' | 'activity'>('comments')
  const [lastReadAt, setLastReadAt] = useState<string | null>(() =>
    localStorage.getItem(`collab_lastRead_${projectId}`),
  )
  const [currentActivityPage, setCurrentActivityPage] = useState(1)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const activityItemsPerPage = 10

  const markAsRead = useCallback(() => {
    const now = new Date().toISOString()
    localStorage.setItem(`collab_lastRead_${projectId}`, now)
    setLastReadAt(now)
  }, [projectId])

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
      const storedLastReadAt = localStorage.getItem(`collab_lastRead_${projectId}`)
      setLastReadAt(storedLastReadAt)
      setActiveSection('comments')
      setCurrentActivityPage(1)

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

      const unreadOnLoad = storedLastReadAt
        ? projectComments.filter((comment) => comment.created_at > storedLastReadAt && comment.user_id !== authData.user?.id).length
        : 0

      if (unreadOnLoad > 0) {
        markAsRead()
      }
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

  const unreadCount = lastReadAt
    ? comments.filter((c) => c.created_at > lastReadAt && c.user_id !== currentUserId).length
    : 0

  const handleCommentsTabClick = () => {
    setActiveSection('comments')
    markAsRead()
  }

  const [selectedProfile, setSelectedProfile] = useState<null | { userId?: string | null; fullName?: string | null; email?: string | null; role?: string | null; joinedAt?: string | null }>(null)

  const openProfileByUserId = (userId: string | null) => {
    if (!userId) return

    const member = members.find((candidate) => candidate.user_id === userId)

    setSelectedProfile(
      member
        ? {
            userId: member.user_id,
            fullName: member.full_name,
            email: member.email,
            role: member.role,
            joinedAt: member.joined_at,
          }
        : {
            userId,
            fullName: membersByUserId[userId] ?? userId,
          },
    )
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
          <ProjectCollaborationCommentsSection
            isLoading={isLoading}
            comments={comments}
            currentUserId={currentUserId}
            members={members}
            membersByUserId={membersByUserId}
            lastReadAt={lastReadAt}
            commentDraft={commentDraft}
            onCommentDraftChange={setCommentDraft}
            onSubmitComment={submitComment}
            isSubmittingComment={isSubmittingComment}
            onOpenProfile={openProfileByUserId}
            onRequestDeleteComment={setPendingDeleteComment}
            pendingDeleteComment={pendingDeleteComment}
            onCancelDeleteComment={() => setPendingDeleteComment(null)}
            onConfirmDeleteComment={deleteCommentHandler}
            commentsEndRef={commentsEndRef}
          />
        )}

        {/* Wiki */}
        {activeSection === 'wiki' && (
          <ProjectCollaborationWikiSection
            canEdit={canEdit}
            isLoading={isLoading}
            wikiTitle={wikiTitle}
            wikiContent={wikiContent}
            wikiDraft={wikiDraft}
            isEditingWiki={isEditingWiki}
            isSavingWiki={isSavingWiki}
            onWikiDraftChange={setWikiDraft}
            onStartEditing={() => { setWikiDraft(wikiContent); setIsEditingWiki(true) }}
            onCancelEditing={() => setIsEditingWiki(false)}
            onSaveWiki={saveWiki}
          />
        )}

        {/* Files */}
        {activeSection === 'files' && (
          <div className="rounded-xl border border-slate-200 bg-white">
            <ProjectDocumentsTab projectId={projectId} canEdit={canEdit} membersByUserId={membersByUserId} currentUserId={currentUserId} />
          </div>
        )}

        {/* Activity */}
        {activeSection === 'activity' && (
          <ProjectCollaborationActivitySection
            isLoading={isLoading}
            events={events}
            membersByUserId={membersByUserId}
            currentActivityPage={currentActivityPage}
            onCurrentActivityPageChange={setCurrentActivityPage}
            activityItemsPerPage={activityItemsPerPage}
            onOpenProfile={openProfileByUserId}
          />
        )}
      </div>

      <UserProfileDialog
        isOpen={Boolean(selectedProfile)}
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />
    </div>
  )
}
