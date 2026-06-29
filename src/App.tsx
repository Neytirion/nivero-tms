import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthPage } from './pages/auth/AuthPage.tsx'
import { AppShell } from './pages/AppShell.tsx'
import { DashboardPage } from './pages/dashboard/DashboardPage.tsx'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.tsx'
import { ProfilePage } from './pages/profile/ProfilePage.tsx'
import { ProjectsPage } from './pages/projects/ProjectsPage.tsx'
import { ProjectDetailsPage } from './pages/projects/ProjectDetailsPage.tsx'
import { CreateProjectPage } from './pages/projects/CreateProjectPage.tsx'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage.tsx'
import { TasksPage } from './pages/tasks/TasksPage.tsx'
import { TaskDetailsPage } from './pages/tasks/TaskDetailsPage.tsx'
import { CreateTaskPage } from './pages/tasks/CreateTaskPage.tsx'
import { TimeTrackingPage } from './pages/time-tracking/TimeTrackingPage.tsx'
import { ResourcePlanningPage } from './pages/resource-planning/ResourcePlanningPage.tsx'
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
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
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
          <Route path="projects/create" element={<CreateProjectPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="tasks/create" element={<CreateTaskPage />} />
          <Route path="tasks/:taskId" element={<TaskDetailsPage />} />
          <Route path="time-tracking" element={<TimeTrackingPage />} />
          <Route path="resources" element={<ResourcePlanningPage />} />
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
