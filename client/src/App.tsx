import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth.api'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import WorkflowEditorPage from '@/pages/WorkflowEditorPage'
import SettingsPage from '@/pages/SettingsPage'
import IdeasDashboardPage from '@/pages/IdeasDashboardPage'
import NewIdeaPage from '@/pages/NewIdeaPage'
import IdeaDetailPage from '@/pages/IdeaDetailPage'
import AppShell from '@/components/layout/AppShell'
import { Loader2 } from 'lucide-react'

function BootstrapGuard({ children }: { children: React.ReactNode }) {
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setBootstrapping = useAuthStore((s) => s.setBootstrapping)

  useEffect(() => {
    let cancelled = false
    const bootstrap = async () => {
      try {
        const { data: refreshData } = await authApi.refresh()
        useAuthStore.getState().setAccessToken(refreshData.accessToken)
        const { data: user } = await authApi.me()
        if (!cancelled) setAuth(user, refreshData.accessToken)
      } catch {
        // No valid session
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }
    bootstrap()
    return () => { cancelled = true }
  }, [setAuth, setBootstrapping])

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto text-cubo-500 animate-spin mb-3" />
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BootstrapGuard>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/flujo/:id" element={<WorkflowEditorPage />} />
                  <Route path="/ideas" element={<IdeasDashboardPage />} />
                  <Route path="/ideas/nueva" element={<NewIdeaPage />} />
                  <Route path="/ideas/:id" element={<IdeaDetailPage />} />
                  <Route path="/configuracion" element={<SettingsPage />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BootstrapGuard>
  )
}
