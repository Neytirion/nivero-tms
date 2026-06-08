import { useEffect, useMemo, useState } from 'react'
import {
  getProjectActivityEvents,
  getProjectMembers,
  getProjectWikiPage,
  saveProjectWikiPage,
  type ActivityEventPreview,
  type ProjectMemberListItem,
} from '../../../../lib/pm'
import { ProjectDocumentsTab } from './ProjectDocumentsTab'

interface ProjectCollaborationTabProps {
  projectId: string
  canEdit: boolean
}

function formatActivityLabel(event: ActivityEventPreview) {
  switch (event.event_type) {
    case 'comment.created':
      return 'Comment added'
    case 'comment.mentioned':
      return 'Mentioned a teammate'
    case 'document.uploaded':
      return 'Document uploaded'
    case 'wiki.updated':
      return 'Wiki updated'
    default:
      return event.event_type
  }
}

function getActorLabel(
  actorUserId: string | null,
  membersByUserId: Record<string, string>,
) {
  if (!actorUserId) {
    return 'System'
  }

  return membersByUserId[actorUserId] ?? actorUserId
}

export function ProjectCollaborationTab({ projectId, canEdit }: ProjectCollaborationTabProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [members, setMembers] = useState<ProjectMemberListItem[]>([])
  const [events, setEvents] = useState<ActivityEventPreview[]>([])
  const [wikiTitle, setWikiTitle] = useState('Project Wiki')
  const [wikiContent, setWikiContent] = useState('')

  const membersByUserId = useMemo(
    () =>
      members.reduce<Record<string, string>>((acc, member) => {
        if (member.user_id) {
          acc[member.user_id] = member.full_name ?? member.email ?? member.user_id
        }
        return acc
      }, {}),
    [members],
  )

  const mentionHints = useMemo(() => {
    return members
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
      .slice(0, 6)
  }, [members])

  const loadData = async () => {
    setIsLoading(true)

    try {
      const [wiki, activityEvents, projectMembers] = await Promise.all([
        getProjectWikiPage(projectId),
        getProjectActivityEvents(projectId, 40),
        getProjectMembers(projectId),
      ])

      setEvents(activityEvents)
      setMembers(projectMembers)

      if (wiki) {
        setWikiTitle(wiki.title)
        setWikiContent(wiki.content)
      } else {
        setWikiTitle('Project Wiki')
        setWikiContent('')
      }

      setStatus('Collaboration data loaded')
    } catch (error) {
      setStatus(error instanceof Error ? `Collaboration load error: ${error.message}` : 'Collaboration load error')
    }

    setIsLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const saveWikiHandler = async () => {
    if (!canEdit) {
      return
    }

    setIsLoading(true)

    try {
      await saveProjectWikiPage({
        projectId,
        title: wikiTitle,
        content: wikiContent,
      })
      await loadData()
      setStatus('Wiki saved')
    } catch (error) {
      setStatus(error instanceof Error ? `Wiki save error: ${error.message}` : 'Wiki save error')
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-900">Wiki</h4>
          <button
            type="button"
            onClick={() => void saveWikiHandler()}
            disabled={!canEdit || isLoading}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            Save Wiki
          </button>
        </div>

        <div className="mt-2 space-y-2">
          <input
            type="text"
            value={wikiTitle}
            onChange={(event) => setWikiTitle(event.target.value)}
            disabled={!canEdit || isLoading}
            placeholder="Wiki title"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          <textarea
            value={wikiContent}
            onChange={(event) => setWikiContent(event.target.value)}
            disabled={!canEdit || isLoading}
            placeholder="Write project knowledge, decisions, links, and runbooks..."
            rows={8}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>
      </div>

      <ProjectDocumentsTab projectId={projectId} canEdit={canEdit} />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <h4 className="text-sm font-semibold text-slate-900">Activity Feed</h4>
        <p className="mt-1 text-xs text-slate-500">Recent collaboration actions in this project</p>

        <div className="mt-3 space-y-2">
          {events.length === 0 ? <p className="text-sm text-slate-500">No activity yet</p> : null}

          {events.map((event) => (
            <div key={event.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-sm text-slate-800">
                <span className="font-semibold text-slate-900">{getActorLabel(event.actor_user_id, membersByUserId)}</span>{' '}
                {formatActivityLabel(event)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">{new Date(event.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
        Mentions: use handles like {mentionHints.length > 0 ? mentionHints.join(', ') : '@teammate'} in task comments.
      </div>

      <p className="text-xs text-slate-500">{status}</p>
    </div>
  )
}
