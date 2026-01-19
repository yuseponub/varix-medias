'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { usePermisos } from '@/lib/hooks/usePermisos'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { tiene } = usePermisos()
  const [userName, setUserName] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    setUserName(localStorage.getItem('user_name') || 'Usuario')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    router.push('/login')
  }

  const menuItems = [
    { icon: '📊', label: 'Dashboard', href: '/admin/dashboard' },
    { icon: '💰', label: 'Ventas', href: '/admin/ventas' },
    { icon: '🛒', label: 'Compras', href: '/admin/compras' },
    { icon: '📦', label: 'Inventario', href: '/admin/inventario' },
    { icon: '📜', label: 'Historial', href: '/admin/historial' },
    ...(tiene('puede_gestionar_usuarios') ? [{ icon: '👥', label: 'Usuarios', href: '/admin/usuarios' }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full transition-all duration-300 z-50 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
        style={{ backgroundColor: '#0e0142' }}
      >
        {/* Logo */}
        <div className="p-4 border-b border-purple-800">
          <div className="flex items-center justify-between">
            {sidebarOpen ? (
              <div>
                <h1 className="text-xl font-bold" style={{ color: '#ffe248' }}>
                  🏥 VARIX
                </h1>
                <p className="text-xs" style={{ color: '#a294da' }}>
                  Sistema de Medias
                </p>
              </div>
            ) : (
              <div className="text-2xl">🏥</div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded hover:bg-purple-800 transition"
              style={{ color: '#ffe248' }}
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="mt-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-2 px-3 py-2 transition-all ${
                  isActive
                    ? 'border-l-4'
                    : 'border-l-4 border-transparent hover:bg-purple-900'
                }`}
                style={{
                  backgroundColor: isActive ? '#1a0a4d' : 'transparent',
                  borderLeftColor: isActive ? '#ffe248' : 'transparent',
                  color: isActive ? '#ffe248' : '#a294da',
                }}
                title={!sidebarOpen ? item.label : undefined}
              >
                <span className="text-lg">{item.icon}</span>
                {sidebarOpen && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-purple-800">
          {sidebarOpen ? (
            <div>
              <div className="mb-2">
                <p className="text-sm font-medium" style={{ color: '#ffe248' }}>
                  {userName}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 text-sm rounded transition hover:opacity-80"
                style={{ backgroundColor: '#ffe248', color: '#0e0142' }}
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-2 rounded transition hover:bg-purple-800"
              style={{ color: '#ffe248' }}
              title="Cerrar Sesión"
            >
              🚪
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {children}
      </main>
    </div>
  )
}
