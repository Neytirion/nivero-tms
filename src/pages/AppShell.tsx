import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { WorkspaceProvider, useWorkspace } from '../features/workspace/workspace-context.tsx'
import { getUnreadUserMentionsCount } from '../lib/pm'
import { ToastProvider } from '../shared/components'
import { GlobalTaskTimerBar } from '../features/time-tracking/global/GlobalTaskTimerBar'
import { GlobalTaskTimerProvider } from '../features/time-tracking/global/GlobalTaskTimerContext'

const baseNavItems = [
  { to: '/app/projects', label: 'Projects' },
  { to: '/app/time-tracking', label: 'Reports' },
]

interface AppShellProps {
  user: User
}

export function AppShell({ user }: AppShellProps) {
  return (
    <ToastProvider>
      <WorkspaceProvider>
        <AppShellLayout user={user} />
      </WorkspaceProvider>
    </ToastProvider>
  )
}

function AppShellLayout({ user }: AppShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    projects,
    selectedProjectId,
    getProjectRole,
    currentUserId,
    setStatus,
    reloadCurrentTasks,
    loadDashboardPreview,
  } = useWorkspace()
  const [unreadMentionsCount, setUnreadMentionsCount] = useState(0)

  const userId = typeof user.id === 'string' ? user.id : null

  const avatarUrl = (user.user_metadata.avatar_url as string | undefined) ?? ''
  const fullName = (user.user_metadata.full_name as string | undefined) ?? ''
  const profileDisplayName = fullName.trim() || user.email || 'User'
  const avatarFallback = (fullName || user.email || '?').charAt(0).toUpperCase()
  const canViewResourcePlanning = projects.some((project) => {
    const role = getProjectRole(project.id)
    return role === 'owner' || role === 'admin' || role === 'manager'
  })
  const activeNavItems = canViewResourcePlanning
    ? [
        ...baseNavItems,
        { to: '/app/resources', label: 'Resources' },
      ]
    : baseNavItems

  useEffect(() => {
    const refreshMentionsCount = async () => {
      if (!userId) {
        setUnreadMentionsCount(0)
        return
      }

      try {
        const count = await getUnreadUserMentionsCount(userId)
        setUnreadMentionsCount(count)
      } catch {
        setUnreadMentionsCount(0)
      }
    }

    void refreshMentionsCount()

    const onMentionsChanged = () => {
      void refreshMentionsCount()
    }

    window.addEventListener('mentions:changed', onMentionsChanged)
    return () => {
      window.removeEventListener('mentions:changed', onMentionsChanged)
    }
  }, [location.pathname, userId])

  // Handle navigation with refresh support
  const handleNavigation = (to: string) => {
    const currentPath = location.pathname
    const isAlreadyOnPage = currentPath === to
    
    if (isAlreadyOnPage) {
      // Add refresh signal to URL to trigger filter reset
      navigate(`${to}?refresh=1`)
    } else {
      navigate(to)
    }
  }

  return (
    <GlobalTaskTimerProvider
      projects={projects}
      currentUserId={currentUserId}
      setStatus={setStatus}
      reloadCurrentTasks={reloadCurrentTasks}
      loadDashboardPreview={loadDashboardPreview}
    >
      <main className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,_#cffafe_0%,_#ecfeff_16%,_#f8fafc_56%,_#f1f5f9_100%)]">
        <section className="w-full min-h-screen bg-white/95">
            <aside className="border-b border-[#cfe5c8] bg-[#e3f1de] px-4 py-5 text-slate-800 lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:h-screen lg:w-[280px] lg:border-b-0 lg:border-r lg:px-5">
              <div className="flex h-full min-h-0 flex-col gap-5">
                <button
                  type="button"
                  onClick={() => navigate('/app/projects')}
                  className="text-left text-base font-semibold text-slate-900 hover:text-slate-700"
                >
                  Nivero PM Tool
                </button>

                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    {(() => {
                      const currentProject = projects.find((p) => p.id === selectedProjectId)
                      return currentProject ? (
                        <div className="rounded-xl border border-[#bad6b2] bg-white/80 p-3 mb-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5f7b57]">Current Project</p>
                          <p className="mt-1.5 text-sm font-semibold text-slate-900 truncate">{currentProject.name.slice(0, 64)}</p>
                          {currentProject.customer_name ? (
                            <p className="mt-0.5 text-xs text-slate-500 truncate">{currentProject.customer_name.slice(0, 64)}</p>
                          ) : null}
                        </div>
                      ) : null
                    })()}
                    <div className="pb-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5f7b57]">
                        Active Modules
                      </p>
                      <nav className="space-y-2">
                        {activeNavItems.map((item) => {
                          const isActive = location.pathname === item.to
                          const isDemoModule = item.to === '/app/resources'
                          return (
                            <button
                              key={item.to}
                              type="button"
                              onClick={() => handleNavigation(item.to)}
                              className={`w-full text-left block rounded-xl border px-3 py-2 ${
                                isActive
                                  ? 'border-[#7fb070] bg-[#f4fbf1] text-slate-900 shadow-sm'
                                  : 'border-[#bad6b2] bg-white/70 text-slate-700 hover:border-[#8fbe83] hover:bg-[#f4fbf1]'
                              }`}
                            >
                              <p className="flex items-center justify-between gap-2 text-sm font-semibold">
                                <span>
                                  {item.label}
                                  {isDemoModule ? ' (demo)' : ''}
                                </span>
                              </p>
                            </button>
                          )
                        })}
                      </nav>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-[#bad6b2] bg-white/75 p-1.5 shadow-sm">
                    <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleNavigation('/app/mentions')}
                      className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition ${
                        location.pathname === '/app/mentions'
                          ? 'border-[#7fb070] bg-[#f4fbf1] text-slate-900 shadow-sm'
                          : 'border-[#c6dec0] bg-white text-slate-700 hover:border-[#8fbe83] hover:bg-[#f4fbf1]'
                      }`}
                      aria-label="Open mentions"
                      title="Open mentions"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4 8 8 6 8-6" />
                      </svg>
                      {unreadMentionsCount > 0 ? (
                        <span className="absolute -right-1 -top-1 rounded-full border border-white bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                          {unreadMentionsCount > 99 ? '99+' : unreadMentionsCount}
                        </span>
                      ) : null}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/app/profile')}
                      className="inline-flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-[#c6dec0] bg-white px-2.5 py-1.5 text-left text-slate-800 transition hover:border-[#8fbe83] hover:bg-[#f4fbf1]"
                      aria-label="Open profile"
                      title="Open profile"
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Profile avatar"
                          className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                        />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xs font-semibold text-slate-700">
                          {avatarFallback}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{profileDisplayName}</span>
                      <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.22 4.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L10.94 10 7.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            </aside>

            <div className="min-h-screen lg:pl-[280px]">
              <div className="p-4 md:p-6 lg:p-8">
              <div className="space-y-5">
                <GlobalTaskTimerBar />
                <Outlet />
              </div>
            </div>
            </div>
        </section>
      </main>
    </GlobalTaskTimerProvider>
  )
}
