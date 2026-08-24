import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getProjectTaskCardColorSettings, type ProjectTaskCardColorSetting, updateProjectTaskCardColor } from '../../lib/pm'
import { useWorkspace } from '../../features/dashboard/workspace-context.tsx'

export function TaskCardSettingsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    projects,
    selectedProjectId,
    selectProject,
    canAssignTasksInProject,
    reloadCurrentTasks,
    setStatus,
  } = useWorkspace()

  const projectIdFromQuery = searchParams.get('projectId')
  const activeProjectId = projectIdFromQuery ?? selectedProjectId
  const selectedProject = projects.find((project) => project.id === activeProjectId) ?? null
  const canManageCardSettings = activeProjectId ? canAssignTasksInProject(activeProjectId) : false

  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<ProjectTaskCardColorSetting[]>([])
  const [draftColorByKey, setDraftColorByKey] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)

  useEffect(() => {
    if (projectIdFromQuery && projectIdFromQuery !== selectedProjectId) {
      selectProject(projectIdFromQuery)
    }
  }, [projectIdFromQuery, selectedProjectId, selectProject])

  useEffect(() => {
    const loadSettings = async () => {
      if (!activeProjectId) {
        setSettings([])
        setDraftColorByKey({})
        return
      }

      setIsLoading(true)
      try {
        const nextSettings = await getProjectTaskCardColorSettings(activeProjectId)
        setSettings(nextSettings)
        setDraftColorByKey(
          nextSettings.reduce<Record<string, string>>((acc, item) => {
            acc[item.settingKey] = item.color
            return acc
          }, {}),
        )
      } catch (error) {
        setStatus(error instanceof Error ? `Error loading card settings: ${error.message}` : 'Error loading card settings')
        setSettings([])
        setDraftColorByKey({})
      } finally {
        setIsLoading(false)
      }
    }

    void loadSettings()
  }, [activeProjectId, setStatus])

  const saveColor = async (setting: ProjectTaskCardColorSetting) => {
    if (!activeProjectId || !canManageCardSettings) {
      return
    }

    const nextColor = draftColorByKey[setting.settingKey] ?? setting.color
    if (nextColor === setting.color) {
      return
    }

    setSavingKey(setting.settingKey)
    try {
      await updateProjectTaskCardColor(activeProjectId, setting.settingKey, nextColor)
      const refreshedSettings = await getProjectTaskCardColorSettings(activeProjectId)
      setSettings(refreshedSettings)
      setDraftColorByKey(
        refreshedSettings.reduce<Record<string, string>>((acc, item) => {
          acc[item.settingKey] = item.color
          return acc
        }, {}),
      )
      await reloadCurrentTasks()
      setStatus(`Updated card color for ${setting.displayName}`)
    } catch (error) {
      setStatus(error instanceof Error ? `Error updating color: ${error.message}` : 'Error updating color')
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="space-y-5">
      <section className="page-section bg-[linear-gradient(120deg,rgba(20,184,166,0.08),rgba(14,165,233,0.06))]">
        <button
          type="button"
          onClick={() => navigate(activeProjectId ? `/app/tasks?projectId=${activeProjectId}` : '/app/tasks')}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          ← Back to Tasks
        </button>

        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Task Board</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Card Settings</h2>
        <p className="mt-2 text-sm text-slate-600">
          Colors are now project-level visual settings. Changing a color here applies to all matching work packages across estimate versions.
        </p>
      </section>

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
            You can view card settings, but only owner/admin/manager can change colors.
          </p>
        ) : null}

        {isLoading ? <p className="text-sm text-slate-600">Loading card settings...</p> : null}

        {!isLoading && selectedProject && settings.length === 0 ? (
          <p className="text-sm text-slate-600">No work packages found for this project.</p>
        ) : null}

        {!isLoading && settings.length > 0 ? (
          <div className="space-y-3">
            {settings.map((setting) => {
              const draftColor = draftColorByKey[setting.settingKey] ?? setting.color
              const isSaving = savingKey === setting.settingKey

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
                        disabled={!canManageCardSettings || isSaving}
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
                      <button
                        type="button"
                        disabled={!canManageCardSettings || isSaving || draftColor === setting.color}
                        onClick={() => {
                          void saveColor(setting)
                        }}
                        className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSaving ? 'Applying...' : 'Apply'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Planned next</p>
        <p className="mt-1 text-sm text-slate-700">
          This page will also host card content preferences (fields visible on each task card).
        </p>
      </section>
    </div>
  )
}
