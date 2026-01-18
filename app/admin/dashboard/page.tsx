'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    efectivo_caja: 0,
    ventas_hoy: 0,
    devoluciones_pendientes: 0,
    stock_critico: 0
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const { data: caja } = await supabase
        .from('caja_efectivo')
        .select('saldo_actual')
        .eq('id', 1)
        .single() as { data: { saldo_actual: number } | null }

      const hoy = new Date().toISOString().split('T')[0]
      const { data: ventas } = await supabase
        .from('ventas')
        .select('total')
        .eq('fecha', hoy) as { data: { total: number }[] | null }

      const { data: devoluciones } = await supabase
        .from('devoluciones')
        .select('id')
        .eq('estado', 'pendiente') as { data: { id: number }[] | null }

      const { data: productos } = await supabase
        .from('productos')
        .select('*')
        .lt('stock_normal', 5) as { data: any[] | null }

      setStats({
        efectivo_caja: caja?.saldo_actual || 0,
        ventas_hoy: ventas?.reduce((sum, v) => sum + Number(v.total), 0) || 0,
        devoluciones_pendientes: devoluciones?.length || 0,
        stock_critico: productos?.length || 0
      })
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#ffe248' }}></div>
          <p className="mt-4" style={{ color: '#0e0142' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#0e0142' }}>
          Dashboard
        </h1>
        <p className="text-gray-600">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Efectivo en Caja */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 transition hover:shadow-xl" style={{ borderLeftColor: '#ffe248' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#fff9e6' }}>
              <svg className="w-6 h-6" style={{ color: '#ffe248' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Efectivo en Caja</p>
          <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
            ${stats.efectivo_caja.toLocaleString('es-CO')}
          </p>
          <a href="/admin/efectivo" className="inline-block mt-3 text-sm font-medium hover:underline" style={{ color: '#ffe248' }}>
            Recoger efectivo →
          </a>
        </div>

        {/* Ventas Hoy */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 transition hover:shadow-xl" style={{ borderLeftColor: '#a294da' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#f3f1fa' }}>
              <svg className="w-6 h-6" style={{ color: '#a294da' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Ventas Hoy</p>
          <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
            ${stats.ventas_hoy.toLocaleString('es-CO')}
          </p>
          <a href="/admin/ventas" className="inline-block mt-3 text-sm font-medium hover:underline" style={{ color: '#a294da' }}>
            Ver todas →
          </a>
        </div>

        {/* Devoluciones Pendientes */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 transition hover:shadow-xl" style={{ borderLeftColor: stats.devoluciones_pendientes > 0 ? '#ff6b6b' : '#a294da' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: stats.devoluciones_pendientes > 0 ? '#ffe6e6' : '#f3f1fa' }}>
              <svg className="w-6 h-6" style={{ color: stats.devoluciones_pendientes > 0 ? '#ff6b6b' : '#a294da' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Devoluciones Pendientes</p>
          <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
            {stats.devoluciones_pendientes}
          </p>
          {stats.devoluciones_pendientes > 0 && (
            <a href="/admin/devoluciones" className="inline-block mt-3 text-sm font-medium hover:underline text-red-600">
              Revisar ahora →
            </a>
          )}
        </div>

        {/* Stock Crítico */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 transition hover:shadow-xl" style={{ borderLeftColor: stats.stock_critico > 0 ? '#ff6b6b' : '#4ade80' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: stats.stock_critico > 0 ? '#ffe6e6' : '#ecfdf5' }}>
              <svg className="w-6 h-6" style={{ color: stats.stock_critico > 0 ? '#ff6b6b' : '#4ade80' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Stock Crítico</p>
          <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
            {stats.stock_critico}
          </p>
          {stats.stock_critico > 0 && (
            <a href="/admin/inventario" className="inline-block mt-3 text-sm font-medium hover:underline text-red-600">
              Ver inventario →
            </a>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickActionCard
          icon="📦"
          title="Gestionar Inventario"
          description="Ver y editar stock de medias"
          href="/admin/inventario"
          color="#ffe248"
        />
        <QuickActionCard
          icon="💰"
          title="Ver Ventas"
          description="Historial completo de ventas"
          href="/admin/ventas"
          color="#a294da"
        />
        <QuickActionCard
          icon="🛒"
          title="Registrar Compra"
          description="Nueva compra de medias"
          href="/admin/compras"
          color="#ffe248"
        />
      </div>
    </div>
  )
}

function QuickActionCard({ icon, title, description, href, color }: {
  icon: string
  title: string
  description: string
  href: string
  color: string
}) {
  return (
    <a
      href={href}
      className="block bg-white rounded-2xl shadow-lg p-6 transition-all hover:shadow-xl hover:-translate-y-1"
    >
      <div className="flex items-start gap-4">
        <div className="text-4xl">{icon}</div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1" style={{ color: '#0e0142' }}>
            {title}
          </h3>
          <p className="text-sm text-gray-600">{description}</p>
          <span className="inline-block mt-2 text-sm font-medium" style={{ color }}>
            Ir al módulo →
          </span>
        </div>
      </div>
    </a>
  )
}
