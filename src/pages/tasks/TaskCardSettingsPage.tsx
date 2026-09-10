import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  DEFAULT_TASK_CARD_FIELD_PREFERENCES,
  getProjectTaskCardColorSettings,
  getProjectTaskCardFieldPreferences,
  type ProjectTaskCardColorSetting,
  type ProjectTaskCardFieldPreferences,
  updateProjectTaskCardColor,
  updateProjectTaskCardFieldPreferences,
} from '../../lib/pm'
import { TaskCard } from '../../features/tasks/components/card'
import { WorkspacePageHeader } from '../../shared/components'
import { useWorkspace } from '../../features/workspace/workspace-context.tsx'

const FIELD_TOGGLE_META: Array<{
  key: keyof ProjectTaskCardFieldPreferences
  title: string
  description: string
}> = [
  { key: 'showDescription', title: 'Description', description: 'Short description text under title.' },
  { key: 'showPriority', title: 'Priority badge', description: 'High / Medium / Low badge.' },
  { key: 'showDueState', title: 'Due state badge', description: 'Overdue / Today / Soon / Planned badge.' },
  { key: 'showDueDate', title: 'Due date value', description: 'Calendar date in a small badge.' },
  { key: 'showAssignee', title: 'Assignee block', description: 'Avatar/initials and assignee name row.' },
  { key: 'showWorkPackage', title: 'Work package badge', description: 'Work package chip with color dot.' },
]

const PRESET_COMPACT: ProjectTaskCardFieldPreferences = {
  showDescription: false,
  showPriority: true,
  showDueState: true,
  showDueDate: false,
  showAssignee: true,
  showWorkPackage: false,
}

const PRESET_DETAILED: ProjectTaskCardFieldPreferences = {
  showDescription: true,
  showPriority: true,
  showDueState: true,
  showDueDate: true,
  showAssignee: true,
  showWorkPackage: true,
}

const PREVIEW_TASK_DUE_DATE = '2026-08-26T00:00:00.000Z'
const PREVIEW_TASK_CREATED_AT = '2026-08-24T00:00:00.000Z'

export function TaskCardSettingsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    projects,
    selectedProjectId,
    selectProject,
    getProjectRole,
    reloadCurrentTasks,
    setStatus,
  } = useWorkspace()

  const projectIdFromQuery = searchParams.get('projectId')
  const activeProjectId = projectIdFromQuery ?? selectedProjectId
  const selectedProject = projects.find((project) => project.id === activeProjectId) ?? null
  const activeProjectRole = activeProjectId ? getProjectRole(activeProjectId) : null
  const canManageCardSettings = activeProjectId
    ? ['owner', 'admin'].includes(activeProjectRole ?? '')
    : false

  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<ProjectTaskCardColorSetting[]>([])
  const [draftColorByKey, setDraftColorByKey] = useState<Record<string, string>>({})
  const [fieldPreferences, setFieldPreferences] = useState<ProjectTaskCardFieldPreferences>(
    DEFAULT_TASK_CARD_FIELD_PREFERENCES,
  )
  const [draftFieldPreferences, setDraftFieldPreferences] = useState<ProjectTaskCardFieldPreferences>(
    DEFAULT_TASK_CARD_FIELD_PREFERENCES,
  )
  const [isApplyingSettings, setIsApplyingSettings] = useState(false)

  useEffect(() => {
    if (projectIdFromQuery && projectIdFromQuery !== selectedProjectId) {
      selectProject(projectIdFromQuery)
    }
  }, [projectIdFromQuery, selectedProjectId, selectProject])

  useEffect(() => {
    if (!activeProjectId || !selectedProject) {
      return
    }

    if (!canManageCardSettings) {
      setStatus('Permission denied: only owner or admin can access card settings')
      navigate(`/app/tasks?projectId=${activeProjectId}`, { replace: true })
    }
  }, [activeProjectId, selectedProject, canManageCardSettings, navigate, setStatus])

  useEffect(() => {
    const loadSettings = async () => {
      if (!activeProjectId) {
        setSettings([])
        setDraftColorByKey({})
        setFieldPreferences(DEFAULT_TASK_CARD_FIELD_PREFERENCES)
        setDraftFieldPreferences(DEFAULT_TASK_CARD_FIELD_PREFERENCES)
        return
      }

      setIsLoading(true)
      try {
        const [nextSettings, nextFieldPreferences] = await Promise.all([
          getProjectTaskCardColorSettings(activeProjectId),
          getProjectTaskCardFieldPreferences(activeProjectId),
        ])

        setSettings(nextSettings)
        setDraftColorByKey(
          nextSettings.reduce<Record<string, string>>((acc, item) => {
            acc[item.settingKey] = item.color
            return acc
          }, {}),
        )
        setFieldPreferences(nextFieldPreferences)
        setDraftFieldPreferences(nextFieldPreferences)
      } catch (error) {
        setStatus(error instanceof Error ? `Error loading card settings: ${error.message}` : 'Error loading card settings')
        setSettings([])
        setDraftColorByKey({})
        setFieldPreferences(DEFAULT_TASK_CARD_FIELD_PREFERENCES)
        setDraftFieldPreferences(DEFAULT_TASK_CARD_FIELD_PREFERENCES)
      } finally {
        setIsLoading(false)
      }
    }

    void loadSettings()
  }, [activeProjectId, setStatus])

  const hasFieldChanges = useMemo(() => (
    JSON.stringify(draftFieldPreferences) !== JSON.stringify(fieldPreferences)
  ), [draftFieldPreferences, fieldPreferences])
  const hasColorChanges = useMemo(() => (
    settings.some((setting) => (draftColorByKey[setting.settingKey] ?? setting.color) !== setting.color)
  ), [draftColorByKey, settings])

  const hasChanges = hasFieldChanges || hasColorChanges

  const applySettings = async () => {
    if (!activeProjectId || !canManageCardSettings || !hasChanges) {
      return
    }

    setIsApplyingSettings(true)
    try {
      const colorUpdates = settings
        .map((setting) => ({
          setting,
          color: draftColorByKey[setting.settingKey] ?? setting.color,
        }))
        .filter(({ setting, color }) => color !== setting.color)

      await Promise.all([
        hasFieldChanges
          ? updateProjectTaskCardFieldPreferences(activeProjectId, draftFieldPreferences)
          : Promise.resolve(),
        ...colorUpdates.map(({ setting, color }) => (
          updateProjectTaskCardColor(activeProjectId, setting.settingKey, color)
        )),
      ])

      const refreshedSettings = await getProjectTaskCardColorSettings(activeProjectId)
      setSettings(refreshedSettings)
      setDraftColorByKey(
        refreshedSettings.reduce<Record<string, string>>((acc, item) => {
          acc[item.settingKey] = item.color
          return acc
        }, {}),
      )
      setFieldPreferences(draftFieldPreferences)
      await reloadCurrentTasks()
      setStatus('Updated card settings')
    } catch (error) {
      setStatus(error instanceof Error ? `Error updating card settings: ${error.message}` : 'Error updating card settings')
    } finally {
      setIsApplyingSettings(false)
    }
  }

  const previewTask = useMemo(() => ({
    id: 'preview-task',
    work_package_id: 'preview-wp',
    title: 'Task from client',
    description: 'Fix checkout rounding issue in order summary and verify mobile layout.',
    status: 'todo',
    priority: 'high',
    assigned_to: 'preview-assignee',
    created_by: 'preview-creator',
    estimate_hours: 8,
    actual_hours: 3,
    blocked_by_task_id: null,
    due_date: PREVIEW_TASK_DUE_DATE,
    project_id: activeProjectId ?? 'preview-project',
    created_at: PREVIEW_TASK_CREATED_AT,
    is_billable: true,
  }), [activeProjectId])

  return (
    <div className="space-y-5">
      <WorkspacePageHeader
        eyebrow="Task Board"
        title="Card Settings"
        backButton={{
          label: '← Back to Tasks',
          onClick: () => navigate(activeProjectId ? `/app/tasks?projectId=${activeProjectId}` : '/app/tasks'),
        }}
        gradientClassName="bg-[linear-gradient(120deg,rgba(20,184,166,0.08),rgba(14,165,233,0.06))]"
      />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {!selectedProject ? (
          <p className="text-sm text-slate-600">Select a project in Tasks to edit card settings.</p>
        ) : null}

        {selectedProject ? (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project</p>
            <p className="text-sm font-semibold text-slate-900">{selectedProject.name}</p>
          </div>
        ) : null}

        {selectedProject && !canManageCardSettings ? (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Only project owner or admin can access and update these settings.
          </p>
        ) : null}

        {isLoading ? <p className="text-sm text-slate-600">Loading card settings...</p> : null}

        {!isLoading && selectedProject ? (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Field Visibility</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canManageCardSettings || isApplyingSettings}
                    onClick={() => setDraftFieldPreferences(PRESET_COMPACT)}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Compact preset
                  </button>
                  <button
                    type="button"
                    disabled={!canManageCardSettings || isApplyingSettings}
                    onClick={() => setDraftFieldPreferences(PRESET_DETAILED)}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Detailed preset
                  </button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {FIELD_TOGGLE_META.map((item) => (
                  <label key={item.key} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={draftFieldPreferences[item.key]}
                      disabled={!canManageCardSettings || isApplyingSettings}
                      onChange={(event) => {
                        const checked = event.target.checked
                        setDraftFieldPreferences((prev) => ({
                          ...prev,
                          [item.key]: checked,
                        }))
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                      <span className="block text-xs text-slate-600">{item.description}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Live preview</p>
                <div className="max-w-sm">
                  <TaskCard
                    task={previewTask}
                    workPackageLabel="Checkout"
                    workPackageColor="#0ea5e9"
                    assigneeUserId="preview-assignee"
                    assigneeLabel="Alex Doe"
                    isLocked={false}
                    fieldPreferences={draftFieldPreferences}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Work Package Colors</h3>

              {settings.length === 0 ? (
                <p className="text-sm text-slate-600">No work packages found for this project.</p>
              ) : (
                <div className="space-y-3">
                  {settings.map((setting) => {
                    const draftColor = draftColorByKey[setting.settingKey] ?? setting.color

                    return (
                      <article key={setting.settingKey} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">{setting.displayName}</p>
                            <p className="text-xs text-slate-500">Linked task groups: {setting.linkedPackageCount}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className="h-6 w-6 rounded-md border border-slate-300"
                              style={{ backgroundColor: draftColor }}
                              aria-hidden="true"
                            />
                            <input
                              type="color"
                              value={draftColor}
                              disabled={!canManageCardSettings || isApplyingSettings}
                              onChange={(event) => {
                                const nextColor = event.target.value
                                setDraftColorByKey((prev) => ({
                                  ...prev,
                                  [setting.settingKey]: nextColor,
                                }))
                              }}
                              className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={`Color for ${setting.displayName}`}
                            />
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            <div className="flex justify-end border-t border-slate-200 pt-4">
              <button
                type="button"
                disabled={!canManageCardSettings || !hasChanges || isApplyingSettings}
                onClick={() => {
                  void applySettings()
                }}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApplyingSettings ? 'Applying...' : 'Apply'}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
