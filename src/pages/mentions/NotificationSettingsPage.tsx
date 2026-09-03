import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DEFAULT_USER_NOTIFICATION_PREFERENCES,
  getUserNotificationPreferences,
  saveUserNotificationPreferences,
  type UserNotificationPreferences,
} from '../../lib/user-notification-preferences'
import { WorkspacePageHeader } from '../../shared/components'

export function NotificationSettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<UserNotificationPreferences>(DEFAULT_USER_NOTIFICATION_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadSettings = async () => {
      try {
        const nextSettings = await getUserNotificationPreferences()
        if (!isMounted) return
        setSettings(nextSettings)
      } catch {
        if (!isMounted) return
        setError('Unable to load notification settings right now.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadSettings()

    return () => {
      isMounted = false
    }
  }, [])

  const updateSetting = async (key: keyof UserNotificationPreferences) => {
    const nextSettings = {
      ...settings,
      [key]: !settings[key],
    }

    setSettings(nextSettings)
    setError(null)
    setIsSaving(true)

    try {
      await saveUserNotificationPreferences(nextSettings)
    } catch {
      setError('Unable to save notification settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleItems: Array<{ key: keyof UserNotificationPreferences; title: string; description: string }> = [
    {
      key: 'slackEnabled',
      title: 'Slack notifications',
      description: 'Send task and project alerts to Slack when enabled.',
    },
    {
      key: 'emailEnabled',
      title: 'Email notifications',
      description: 'Receive email summaries for important project activity.',
    },
    {
      key: 'mentionAlerts',
      title: 'Mention alerts',
      description: 'Notify you when someone mentions you in comments.',
    },
    {
      key: 'taskAssignments',
      title: 'Task assignments',
      description: 'Get notified when a task is assigned to you or your team.',
    },
    {
      key: 'taskUpdates',
      title: 'Task updates',
      description: 'Receive progress and status change notifications.',
    },
    {
      key: 'projectInvites',
      title: 'Project invites',
      description: 'Notify you when someone adds you to a project.',
    },
  ]

  return (
    <div className="space-y-4">
      <WorkspacePageHeader
        eyebrow="Preferences"
        title="Notification settings"
        actions={(
          <button
            type="button"
            onClick={() => navigate('/app/mentions')}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to mentions
          </button>
        )}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Delivery preferences</p>
            <p className="text-sm text-slate-500">Choose which alerts you want to receive.</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${isSaving ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {isSaving ? 'Saving...' : 'Saved'}
          </span>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {toggleItems.map((item) => {
              const enabled = settings[item.key]

              return (
                <div
                  key={item.key}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                  </div>

                  <button
                    type="button"
                    aria-pressed={enabled}
                    onClick={() => updateSetting(item.key)}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
                      enabled ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-slate-200'
                    }`}
                    title={enabled ? `Disable ${item.title}` : `Enable ${item.title}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
