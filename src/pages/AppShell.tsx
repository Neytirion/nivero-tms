import type { User } from '@supabase/supabase-js'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { WorkspaceProvider, useWorkspace } from '../features/dashboard/workspace-context.tsx'

const baseNavItems = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/projects', label: 'Projects' },
  { to: '/app/tasks', label: 'Tasks' },
  { to: '/app/time-tracking', label: 'Time Tracking' },
]

interface AppShellProps {
  user: User
}

export function AppShell({ user }: AppShellProps) {
  return (
    <WorkspaceProvider>
      <AppShellLayout user={user} />
    </WorkspaceProvider>
  )
}

function AppShellLayout({ user }: AppShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { projects, selectedProjectId, selectProject, isLoading, getProjectRole } = useWorkspace()

  const avatarUrl = (user.user_metadata.avatar_url as string | undefined) ?? ''
  const fullName = (user.user_metadata.full_name as string | undefined) ?? ''
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,_#cffafe_0%,_#ecfeff_16%,_#f8fafc_56%,_#f1f5f9_100%)]">
        <section className="w-full min-h-screen bg-white/95">
            <aside className="border-b border-[#cfe5c8] bg-[#e3f1de] px-4 py-5 text-slate-800 lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:h-screen lg:w-[280px] lg:border-b-0 lg:border-r lg:px-5">
              <div className="flex h-full min-h-0 flex-col gap-5">
                <button
                  type="button"
                  onClick={() => navigate('/app/dashboard')}
                  className="text-left text-base font-semibold text-slate-900 hover:text-slate-700"
                >
                  Nivero PM Tool
                </button>

                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="rounded-xl border border-[#bad6b2] bg-white/80 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5f7b57]">Current Project</p>
                      <select
                        aria-label="Select current project"
                        value={selectedProjectId ?? ''}
                        onChange={(event) => {
                          if (!event.target.value) return
                          void selectProject(event.target.value)
                        }}
                        disabled={projects.length === 0 || isLoading}
                        className="mt-2 w-full rounded-lg border border-[#bad6b2] bg-white px-2.5 py-2 text-sm text-slate-800 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {projects.length === 0 ? (
                          <option value="">No projects available</option>
                        ) : null}
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4 pb-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5f7b57]">
                        Active Modules
                      </p>
                      <nav className="space-y-2">
                        {activeNavItems.map((item) => {
                          const isActive = location.pathname === item.to
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
                              <p className="text-sm font-semibold">{item.label}</p>
                            </button>
                          )
                        })}
                      </nav>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/app/profile')}
                    className="mt-4 inline-flex w-full items-center gap-3 rounded-xl border border-[#bad6b2] bg-white/80 px-3 py-2 text-left text-slate-800 hover:border-[#8fbe83] hover:bg-[#f4fbf1]"
                    aria-label="Open profile"
                    title="Open profile"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile avatar"
                        className="h-9 w-9 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xs font-semibold text-slate-700">
                        {avatarFallback}
                      </span>
                    )}
                    <span>
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5f7b57]">Profile</span>
                      <span className="block text-sm font-semibold text-slate-900">Open profile</span>
                    </span>
                  </button>
                </div>
              </div>
            </aside>

            <div className="min-h-screen lg:pl-[280px]">
              <div className="p-4 md:p-6 lg:p-8">
              <div className="space-y-5">
                <Outlet />
              </div>
            </div>
            </div>
        </section>
      </main>
  )
}
