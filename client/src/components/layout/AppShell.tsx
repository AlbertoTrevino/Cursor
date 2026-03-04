import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Settings, LogOut, Menu, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth.api'

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      logout()
    }
  }

  const isEditor = location.pathname.startsWith('/flujo/')
  if (isEditor) return <>{children}</>

  const navLinks = (
    <>
      <Link
        to="/"
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
          location.pathname === '/'
            ? 'bg-cubo-50 text-cubo-700'
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <LayoutDashboard size={18} />
        Mis Flujos
      </Link>
      <Link
        to="/configuracion"
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
          location.pathname === '/configuracion'
            ? 'bg-cubo-50 text-cubo-700'
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Settings size={18} />
        Configuración
      </Link>
    </>
  )

  return (
    <div className="flex h-screen">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 text-gray-600 hover:text-gray-900 rounded"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-bold text-cubo-700">Cubo AI</h1>
        <div className="w-8" />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-cubo-700">Cubo AI</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600 md:hidden"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1">{navLinks}</nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 truncate">
              {user?.displayName}
            </span>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
    </div>
  )
}
