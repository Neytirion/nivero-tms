import type { ProjectPreview, TaskPreview } from '../../../../lib/pm'
import type { ProjectRoleName } from '../../../../shared/utils/permissions'
import { deriveProgress, deriveRisk, formatDate } from '../../utils/project-metrics'
import { EstimatesTab } from '../estimates'
import { TeamAccessSection } from './TeamAccessSection'

export type DetailsTab = 'overview' | 'tasks' | 'estimates' | 'team' | 'settings'

interface ProjectDetailsSectionProps {
  selectedProject: ProjectPreview | null
  selectedProjectId: string | null
  myRoleInSelectedProject?: ProjectRoleName | null
  isLoading: boolean
  canManageProject: (projectId: string) => boolean
  activeTab: DetailsTab
  onTabChange: (tab: DetailsTab) => void
  settingsName: string
  onSettingsNameChange: (value: string) => void
  settingsDescription: string
  onSettingsDescriptionChange: (value: string) => void
  settingsDeadline: string
  onSettingsDeadlineChange: (value: string) => void
  canEditSelectedProject: boolean
  canDeleteSelectedProject?: boolean
  tasks: TaskPreview[]
  incompleteTaskCount?: number
  teamMemberNames: string[]
  projectManagerName?: string
  canInviteToSelectedProject: boolean
  memberEmail: string
  onMemberEmailChange: (value: string) => void
  memberRole: string
  onMemberRoleChange: (value: string) => void
  canAssignAdminRole: boolean
  canAssignManagerRole?: boolean
  onInviteMember: () => void | Promise<void>
  projectMembers: import('../../../../lib/pm').ProjectMemberListItem[]
  pendingRoleByUserId: Record<string, string>
  onPendingRoleChange: (userId: string, role: string) => void
  selectedProjectOwnerId: string | null | undefined
  onSaveRole: (userId: string, fallbackRole: string) => void | Promise<void>
  onOpenDeleteConfirm?: () => void
  onOpenCompleteConfirm: () => void
  onOpenSaveSettingsConfirm: () => void
}

export function ProjectDetailsSection({
  selectedProject,
  selectedProjectId,
  myRoleInSelectedProject,
  isLoading,
  canManageProject,
  activeTab,
  onTabChange,
  settingsName,
  onSettingsNameChange,
  settingsDescription,
  onSettingsDescriptionChange,
  settingsDeadline,
  onSettingsDeadlineChange,
  canEditSelectedProject,
  canDeleteSelectedProject,
  tasks,
  incompleteTaskCount,
  teamMemberNames,
  projectManagerName,
  canInviteToSelectedProject,
  memberEmail,
  onMemberEmailChange,
  memberRole,
  onMemberRoleChange,
  canAssignAdminRole,
  canAssignManagerRole,
  onInviteMember,
  projectMembers,
  pendingRoleByUserId,
  onPendingRoleChange,
  selectedProjectOwnerId,
  onSaveRole,
  onOpenDeleteConfirm,
  onOpenCompleteConfirm,
  onOpenSaveSettingsConfirm,
}: ProjectDetailsSectionProps) {
  return (
    <section className="page-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="section-title">Project Details</h3>
          <p className="section-subtitle">
            {selectedProject
              ? `${selectedProject.name} · ${selectedProject.status ?? 'active'}`
              : 'Select a project from the table to open details'}
          </p>
          {myRoleInSelectedProject ? (
            <p className="mt-1 text-xs text-cyan-700">Your role: {myRoleInSelectedProject}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onOpenCompleteConfirm}
          disabled={
            isLoading ||
            !selectedProjectId ||
            !selectedProject ||
            (incompleteTaskCount ?? 0) > 0 ||
            (selectedProject.status ?? '').toLowerCase() === 'completed' ||
            !canManageProject(selectedProjectId)
          }
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Complete project
        </button>
      </div>

      {!selectedProject ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
          No project selected
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'tasks', label: 'Tasks' },
              { key: 'estimates', label: 'Estimates' },
              { key: 'team', label: 'Team Access' },
              { key: 'settings', label: 'Settings' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key as DetailsTab)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                  activeTab === tab.key
                    ? 'border-cyan-300 bg-cyan-100 text-cyan-900'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' ? (
            <div className="mt-4 grid gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-sm font-semibold text-slate-900">Overview</h4>
                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dates</p>
                    <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                      <p><span className="font-semibold text-slate-900">Start:</span> {formatDate(selectedProject.start_date)}</p>
                      <p><span className="font-semibold text-slate-900">End:</span> {formatDate(selectedProject.end_date)}</p>
                      <p><span className="font-semibold text-slate-900">Deadline:</span> {formatDate(selectedProject.deadline_at)}</p>
                      <p><span className="font-semibold text-slate-900">Created:</span> {formatDate(selectedProject.created_at)}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project Info</p>
                    <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                      <p><span className="font-semibold text-slate-900">Customer:</span> {selectedProject.customer_name ?? 'Not set'}</p>
                      <p>
                        <span className="font-semibold text-slate-900">Project Manager:</span>{' '}
                        {projectManagerName ?? (selectedProject.project_manager_id ? 'Assigned' : 'Not set')}
                      </p>
                      <p><span className="font-semibold text-slate-900">Status:</span> {selectedProject.status ?? 'active'}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery & Team</p>
                    <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                      <p><span className="font-semibold text-slate-900">Progress:</span> {deriveProgress(selectedProject)}%</p>
                      <p><span className="font-semibold text-slate-900">Estimated:</span> {(selectedProject.estimated_hours ?? 0).toFixed(1)}h</p>
                      <p><span className="font-semibold text-slate-900">Actual:</span> {(selectedProject.actual_hours ?? 0).toFixed(1)}h</p>
                      <p><span className="font-semibold text-slate-900">Risk:</span> {deriveRisk(selectedProject)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {teamMemberNames.length === 0 ? (
                        <span className="text-xs text-slate-500">No members yet</span>
                      ) : (
                        teamMemberNames.map((name) => (
                          <span
                            key={name}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700"
                          >
                            {name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'team' ? (
            <div className="mt-4">
              <TeamAccessSection
                isEmbedded
                canInviteToSelectedProject={canInviteToSelectedProject}
                memberEmail={memberEmail}
                onMemberEmailChange={onMemberEmailChange}
                memberRole={memberRole}
                onMemberRoleChange={onMemberRoleChange}
                canAssignAdminRole={canAssignAdminRole}
                canAssignManagerRole={canAssignManagerRole}
                onInviteMember={onInviteMember}
                isLoading={isLoading}
                selectedProjectId={selectedProjectId}
                projectMembers={projectMembers}
                canEditSelectedProject={canEditSelectedProject}
                pendingRoleByUserId={pendingRoleByUserId}
                onPendingRoleChange={onPendingRoleChange}
                selectedProjectOwnerId={selectedProjectOwnerId}
                onSaveRole={onSaveRole}
              />
            </div>
          ) : null}

          {activeTab === 'settings' ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <h4 className="text-sm font-semibold text-slate-900">Project Settings</h4>
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={settingsName}
                  onChange={(event) => onSettingsNameChange(event.target.value)}
                  placeholder="Project name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                  disabled={!canEditSelectedProject}
                />
                <input
                  type="text"
                  value={settingsDescription}
                  onChange={(event) => onSettingsDescriptionChange(event.target.value)}
                  placeholder="Project description"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                  disabled={!canEditSelectedProject}
                />
                <input
                  type="date"
                  value={settingsDeadline}
                  onChange={(event) => onSettingsDeadlineChange(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                  disabled={!canEditSelectedProject}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onOpenSaveSettingsConfirm}
                  disabled={!canEditSelectedProject || isLoading}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save settings
                </button>
                {onOpenDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={onOpenDeleteConfirm}
                    disabled={!canDeleteSelectedProject || isLoading}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete project
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === 'tasks' ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <h4 className="text-sm font-semibold text-slate-900">Tasks in Selected Project</h4>
              <div className="mt-3 space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-sm text-slate-500">No tasks yet</p>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                      <p className="text-xs text-slate-500">
                        {task.status ?? 'todo'} · {task.priority ?? 'medium'} · {(task.actual_hours ?? 0).toFixed(1)}h
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {activeTab === 'estimates' ? (
            <EstimatesTab projectId={selectedProject.id} canEdit={canEditSelectedProject} />
          ) : null}

        </>
      )}
    </section>
  )
}
