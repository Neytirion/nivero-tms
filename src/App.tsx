import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthPage } from './pages/AuthPage.tsx'
import { AppShell } from './pages/AppShell.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { ProfilePage } from './pages/ProfilePage.tsx'
import { ProjectsPage } from './pages/ProjectsPage.tsx'
import { TasksPage } from './pages/TasksPage.tsx'
import { useAuthSession } from './features/auth/useAuthSession.ts'

function App() {
  const { user, isAuthLoading } = useAuthSession()

  if (isAuthLoading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg border border-slate-200 text-center">
          <p className="text-slate-700">Checking session...</p>
        </section>
      </main>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={user ? <Navigate to="/app/dashboard" replace /> : <AuthPage />}
        />
        <Route
          path="/app"
          element={user ? <AppShell user={user} /> : <Navigate to="/auth" replace />}
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage user={user!} />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route index element={<Navigate to="/app/dashboard" replace />} />
        </Route>
        <Route
          path="/profile"
          element={<Navigate to={user ? '/app/dashboard' : '/auth'} replace />}
        />
        <Route path="*" element={<Navigate to={user ? '/app/dashboard' : '/auth'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
