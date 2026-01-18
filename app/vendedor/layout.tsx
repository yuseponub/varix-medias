'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

export default function VendedorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [userName, setUserName] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const role = localStorage.getItem('user_role')
    // Permitir tanto vendedores como admins
    if (role !== 'vendedor' && role !== 'admin') {
      router.push('/login')
      return
    }

    setUserName(localStorage.getItem('user_name') || 'Vendedor')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    router.push('/login')
  }

  const menuItems = [
    { icon: '🛍️', label: 'Vender', href: '/vendedor/vender' },
    { icon: '📊', label: 'Mis Ventas', href: '/vendedor/mis-ventas' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ backgroundColor: '#0e0142' }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🏥</div>
              <div>
                <h1 className="font-bold" style={{ color: '#ffe248' }}>
                  VARIX Vendedor
                </h1>
                <p className="text-xs" style={{ color: '#a294da' }}>
                  {userName}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg transition hover:opacity-80"
              style={{ backgroundColor: '#ffe248', color: '#0e0142' }}
            >
              🚪
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex border-t" style={{ borderTopColor: '#1a0a4d' }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex-1 flex items-center justify-center gap-2 py-3 transition-all border-b-2`}
                style={{
                  borderBottomColor: isActive ? '#ffe248' : 'transparent',
                  backgroundColor: isActive ? '#1a0a4d' : 'transparent',
                  color: isActive ? '#ffe248' : '#a294da',
                }}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </a>
            )
          })}
        </nav>
      </header>

      {/* Main Content */}
      <main className="pb-6">
        {children}
      </main>
    </div>
  )
}
