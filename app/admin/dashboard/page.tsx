'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getFechaActual } from '@/lib/utils/dates'

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    efectivo_caja: 0,
    ventas_hoy: 0,
    ventas_hoy_count: 0,
    ventas_mes: 0,
    devoluciones_pendientes: 0,
    compras_por_recibir: 0,
    stock_critico: 0,
    stock_total: 0,
    productos_mas_vendidos: [] as { producto: string, cantidad: number }[],
    actividad_reciente: [] as { tipo: string, descripcion: string, hora: string }[]
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const hoy = getFechaActual()
      const inicioMes = new Date()
      inicioMes.setDate(1)
      const fechaMes = inicioMes.toISOString().split('T')[0]

      // 1. Efectivo en caja
      const { data: caja } = await supabase
        .from('caja_efectivo')
        .select('saldo_actual')
        .eq('id', 1)
        .single() as { data: { saldo_actual: number } | null }

      // 2. Ventas de hoy
      const { data: ventasHoy } = await supabase
        .from('ventas')
        .select('valor_total')
        .eq('fecha', hoy)
        .eq('estado', 'completada') as { data: { valor_total: number }[] | null }

      // 3. Ventas del mes
      const { data: ventasMes } = await supabase
        .from('ventas')
        .select('valor_total')
        .gte('fecha', fechaMes)
        .eq('estado', 'completada') as { data: { valor_total: number }[] | null }

      // 4. Devoluciones pendientes
      const { data: devoluciones } = await supabase
        .from('devoluciones')
        .select('id')
        .eq('estado', 'pendiente') as { data: { id: number }[] | null }

      // 5. Compras por recibir
      const { data: comprasPendientes } = await supabase
        .from('compras')
        .select('id')
        .eq('estado', 'por_recibir') as { data: { id: number }[] | null }

      // 6. Stock crítico y total
      const { data: productos } = await supabase
        .from('productos')
        .select('stock_normal') as { data: { stock_normal: number }[] | null }

      const productosCriticos = productos?.filter(p => p.stock_normal < 5).length || 0
      const stockTotal = productos?.reduce((sum, p) => sum + p.stock_normal, 0) || 0

      // 7. Productos más vendidos hoy
      const { data: ventasDetalle } = await supabase
        .from('ventas')
        .select(`
          productos_vendidos,
          fecha
        `)
        .eq('fecha', hoy)
        .eq('estado', 'completada') as { data: { productos_vendidos: any[], fecha: string }[] | null }

      const conteoProductos: { [key: string]: number } = {}
      ventasDetalle?.forEach(venta => {
        venta.productos_vendidos?.forEach((prod: any) => {
          const key = `${prod.tipo} ${prod.talla} (${prod.codigo})`
          conteoProductos[key] = (conteoProductos[key] || 0) + (prod.cantidad || 1)
        })
      })

      const productosMasVendidos = Object.entries(conteoProductos)
        .map(([producto, cantidad]) => ({ producto, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5)

      // 8. Actividad reciente (últimas 5 operaciones de hoy)
      const actividadReciente: { tipo: string, descripcion: string, hora: string }[] = []

      const { data: ventasRecientes } = await supabase
        .from('ventas')
        .select('numero_factura, hora, valor_total')
        .eq('fecha', hoy)
        .order('hora', { ascending: false })
        .limit(3) as { data: { numero_factura: string, hora: string, valor_total: number }[] | null }

      ventasRecientes?.forEach(v => {
        actividadReciente.push({
          tipo: 'venta',
          descripcion: `Venta #${v.numero_factura} - $${v.valor_total.toLocaleString('es-CO')}`,
          hora: v.hora
        })
      })

      const { data: devolucionesRecientes } = await supabase
        .from('devoluciones')
        .select('hora, monto_devuelto')
        .eq('fecha', hoy)
        .order('hora', { ascending: false })
        .limit(2) as { data: { hora: string, monto_devuelto: number }[] | null }

      devolucionesRecientes?.forEach(d => {
        actividadReciente.push({
          tipo: 'devolucion',
          descripcion: `Devolución - $${d.monto_devuelto.toLocaleString('es-CO')}`,
          hora: d.hora
        })
      })

      actividadReciente.sort((a, b) => b.hora.localeCompare(a.hora))

      setStats({
        efectivo_caja: caja?.saldo_actual || 0,
        ventas_hoy: ventasHoy?.reduce((sum, v) => sum + Number(v.valor_total), 0) || 0,
        ventas_hoy_count: ventasHoy?.length || 0,
        ventas_mes: ventasMes?.reduce((sum, v) => sum + Number(v.valor_total), 0) || 0,
        devoluciones_pendientes: devoluciones?.length || 0,
        compras_por_recibir: comprasPendientes?.length || 0,
        stock_critico: productosCriticos,
        stock_total: stockTotal,
        productos_mas_vendidos: productosMasVendidos,
        actividad_reciente: actividadReciente.slice(0, 5)
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

      {/* Stats Cards - Primera Fila */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Efectivo en Caja */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 transition hover:shadow-xl" style={{ borderLeftColor: '#ffe248' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#fff9e6' }}>
              <span className="text-2xl">💵</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Efectivo en Caja</p>
          <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
            ${stats.efectivo_caja.toLocaleString('es-CO')}
          </p>
          <a href="/admin/efectivo" className="inline-block mt-3 text-sm font-medium hover:underline" style={{ color: '#ffe248' }}>
            Gestionar efectivo →
          </a>
        </div>

        {/* Ventas Hoy */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 transition hover:shadow-xl" style={{ borderLeftColor: '#4ade80' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#ecfdf5' }}>
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Ventas Hoy</p>
          <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
            ${stats.ventas_hoy.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.ventas_hoy_count} {stats.ventas_hoy_count === 1 ? 'venta' : 'ventas'}
          </p>
        </div>

        {/* Ventas del Mes */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 transition hover:shadow-xl" style={{ borderLeftColor: '#a294da' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#f3f1fa' }}>
              <span className="text-2xl">📈</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Ventas del Mes</p>
          <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
            ${stats.ventas_mes.toLocaleString('es-CO')}
          </p>
          <a href="/admin/ventas" className="inline-block mt-3 text-sm font-medium hover:underline" style={{ color: '#a294da' }}>
            Ver todas →
          </a>
        </div>

        {/* Stock Total */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 transition hover:shadow-xl" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#eff6ff' }}>
              <span className="text-2xl">📦</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Stock Total</p>
          <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
            {stats.stock_total} pares
          </p>
          <a href="/admin/inventario" className="inline-block mt-3 text-sm font-medium hover:underline" style={{ color: '#3b82f6' }}>
            Ver inventario →
          </a>
        </div>
      </div>

      {/* Stats Cards - Segunda Fila (Alertas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Devoluciones Pendientes */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 transition hover:shadow-xl" style={{ borderLeftColor: stats.devoluciones_pendientes > 0 ? '#ff6b6b' : '#a294da' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: stats.devoluciones_pendientes > 0 ? '#ffe6e6' : '#f3f1fa' }}>
              <span className="text-2xl">{stats.devoluciones_pendientes > 0 ? '⚠️' : '✅'}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Devoluciones Pendientes</p>
          <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
            {stats.devoluciones_pendientes}
          </p>
          {stats.devoluciones_pendientes > 0 && (
            <a href="/admin/ventas" className="inline-block mt-3 text-sm font-medium hover:underline text-red-600">
              Revisar ahora →
            </a>
          )}
        </div>

        {/* Compras por Recibir */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 transition hover:shadow-xl" style={{ borderLeftColor: stats.compras_por_recibir > 0 ? '#f59e0b' : '#a294da' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: stats.compras_por_recibir > 0 ? '#fef3c7' : '#f3f1fa' }}>
              <span className="text-2xl">{stats.compras_por_recibir > 0 ? '📬' : '✅'}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Compras por Recibir</p>
          <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
            {stats.compras_por_recibir}
          </p>
          {stats.compras_por_recibir > 0 && (
            <a href="/admin/por-recibir" className="inline-block mt-3 text-sm font-medium hover:underline" style={{ color: '#f59e0b' }}>
              Ver pendientes →
            </a>
          )}
        </div>

        {/* Stock Crítico */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 transition hover:shadow-xl" style={{ borderLeftColor: stats.stock_critico > 0 ? '#ff6b6b' : '#4ade80' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: stats.stock_critico > 0 ? '#ffe6e6' : '#ecfdf5' }}>
              <span className="text-2xl">{stats.stock_critico > 0 ? '🔴' : '✅'}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Productos con Stock Crítico</p>
          <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
            {stats.stock_critico}
          </p>
          {stats.stock_critico > 0 && (
            <a href="/admin/inventario" className="inline-block mt-3 text-sm font-medium hover:underline text-red-600">
              Ver productos →
            </a>
          )}
        </div>
      </div>

      {/* Sección de Información */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Productos Más Vendidos Hoy */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#0e0142' }}>
            <span>🏆</span> Productos Más Vendidos Hoy
          </h2>
          {stats.productos_mas_vendidos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay ventas registradas hoy</p>
          ) : (
            <div className="space-y-3">
              {stats.productos_mas_vendidos.map((producto, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#f5f3ff' }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: '#a294da', color: 'white' }}
                    >
                      {index + 1}
                    </div>
                    <span className="font-medium" style={{ color: '#0e0142' }}>{producto.producto}</span>
                  </div>
                  <span className="font-bold" style={{ color: '#a294da' }}>
                    {producto.cantidad} {producto.cantidad === 1 ? 'par' : 'pares'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actividad Reciente */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#0e0142' }}>
            <span>🕐</span> Actividad Reciente
          </h2>
          {stats.actividad_reciente.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay actividad reciente</p>
          ) : (
            <div className="space-y-3">
              {stats.actividad_reciente.map((actividad, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border-l-4" style={{
                  backgroundColor: '#f9fafb',
                  borderLeftColor: actividad.tipo === 'venta' ? '#4ade80' : '#f59e0b'
                }}>
                  <span className="text-xl">{actividad.tipo === 'venta' ? '💰' : '↩️'}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: '#0e0142' }}>{actividad.descripcion}</p>
                    <p className="text-xs text-gray-500">{actividad.hora}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: '#0e0142' }}>
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            icon="💰"
            title="Registrar Venta"
            description="Nueva venta de medias"
            href="/admin/registrar-venta"
            color="#4ade80"
          />
          <QuickActionCard
            icon="🛒"
            title="Nueva Compra"
            description="Registrar compra de medias"
            href="/admin/registrar-compra"
            color="#3b82f6"
          />
          <QuickActionCard
            icon="💸"
            title="Gasto Extra"
            description="Registrar gasto adicional"
            href="/admin/gastos-extra"
            color="#f59e0b"
          />
          <QuickActionCard
            icon="📜"
            title="Ver Historial"
            description="Historial completo"
            href="/admin/historial"
            color="#a294da"
          />
        </div>
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
