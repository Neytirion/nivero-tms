import type { User } from '@supabase/supabase-js'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,_#cffafe_0%,_#ecfeff_16%,_#f8fafc_56%,_#f1f5f9_100%)]">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#e0f2da]">
          <div className="flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => navigate('/app/dashboard')}
              className="text-base font-semibold text-slate-900 hover:text-slate-700"
            >
              Nivero PM Tool
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/profile')}
              className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-left hover:border-cyan-300 hover:bg-cyan-50"
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
            </button>
          </div>
        </header>

        <section className="w-full min-h-[calc(100vh-4rem)] overflow-hidden bg-white/95">
          <div className="grid min-h-[calc(100vh-4rem)] gap-0 lg:grid-cols-[280px_1fr]">
            <aside className="border-b border-[#cfe5c8] bg-[#e3f1de] px-4 py-5 text-slate-800 lg:border-b-0 lg:border-r lg:px-5">
              <div>
                <div className="mb-4 rounded-xl border border-[#bad6b2] bg-white/80 p-3">
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

                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5f7b57]">
                  Active Modules
                </p>
                <nav className="space-y-2">
                  {activeNavItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `block rounded-xl border px-3 py-2 ${
                          isActive
                            ? 'border-[#7fb070] bg-[#f4fbf1] text-slate-900 shadow-sm'
                            : 'border-[#bad6b2] bg-white/70 text-slate-700 hover:border-[#8fbe83] hover:bg-[#f4fbf1]'
                        }`
                      }
                    >
                      <p className="text-sm font-semibold">{item.label}</p>
                    </NavLink>
                  ))}
                </nav>
              </div>
            </aside>

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
