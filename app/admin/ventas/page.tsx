'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Venta {
  id: string
  fecha: string
  hora: string
  numero_factura?: string
  nombre_cliente?: string
  cedula_cliente?: string
  total: number
  cantidad_pares: number
  metodo_pago: string
  factura_url?: string
  vendedor_nombre: string
  verificada: boolean
}

export default function VentasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [ventas, setVentas] = useState<Venta[]>([])
  const [ventasFiltradas, setVentasFiltradas] = useState<Venta[]>([])
  const [filter, setFilter] = useState<'all' | 'hoy' | 'semana' | 'mes'>('hoy')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    checkAuth()
    loadVentas()
  }, [filter])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const role = localStorage.getItem('user_role')
    if (role !== 'admin') {
      router.push('/vendedor/vender')
      return
    }
  }

  const loadVentas = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('ventas')
        .select(`
          *,
          usuarios:vendedor_id (nombre)
        `)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      // Aplicar filtros de fecha
      const hoy = new Date().toISOString().split('T')[0]
      if (filter === 'hoy') {
        query = query.eq('fecha', hoy)
      } else if (filter === 'semana') {
        const semanaAtras = new Date()
        semanaAtras.setDate(semanaAtras.getDate() - 7)
        query = query.gte('fecha', semanaAtras.toISOString().split('T')[0])
      } else if (filter === 'mes') {
        const mesAtras = new Date()
        mesAtras.setMonth(mesAtras.getMonth() - 1)
        query = query.gte('fecha', mesAtras.toISOString().split('T')[0])
      }

      const { data, error } = await query

      if (error) throw error

      const ventasFormateadas = data?.map(v => ({
        id: v.id,
        fecha: v.fecha,
        hora: v.hora,
        numero_factura: v.numero_factura,
        nombre_cliente: v.nombre_cliente,
        cedula_cliente: v.cedula_cliente,
        total: v.total,
        cantidad_pares: v.cantidad_pares,
        metodo_pago: v.metodo_pago,
        factura_url: v.factura_url,
        vendedor_nombre: v.usuarios?.nombre || 'Desconocido',
        verificada: v.verificada
      })) || []

      setVentas(ventasFormateadas)
      setVentasFiltradas(ventasFormateadas)
    } catch (error) {
      console.error('Error cargando ventas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerFactura = (url?: string) => {
    if (url) {
      window.open(url, '_blank')
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)

    if (!term.trim()) {
      setVentasFiltradas(ventas)
      return
    }

    const searchLower = term.toLowerCase().trim()

    const filtered = ventas.filter(venta => {
      // Buscar en número de factura
      if (venta.numero_factura?.toLowerCase().includes(searchLower)) return true

      // Buscar en nombre del cliente
      if (venta.nombre_cliente?.toLowerCase().includes(searchLower)) return true

      // Buscar en cédula del cliente
      if (venta.cedula_cliente?.includes(searchLower)) return true

      // Buscar en vendedor
      if (venta.vendedor_nombre?.toLowerCase().includes(searchLower)) return true

      // Buscar en total (convertir a string)
      if (venta.total.toString().includes(searchLower)) return true

      return false
    })

    setVentasFiltradas(filtered)
  }

  const totalVentas = ventasFiltradas.reduce((sum, v) => sum + v.total, 0)
  const totalPares = ventasFiltradas.reduce((sum, v) => sum + v.cantidad_pares, 0)
  const ventasVerificadas = ventasFiltradas.filter(v => v.verificada).length
  const ventasPendientes = ventasFiltradas.filter(v => !v.verificada).length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#ffe248' }}></div>
          <p className="mt-4" style={{ color: '#0e0142' }}>Cargando ventas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#0e0142' }}>
          💰 Ventas
        </h1>
        <p className="text-gray-600">
          Historial y gestión de ventas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: '#ffe248' }}>
          <p className="text-sm text-gray-500 mb-1">Total Ventas</p>
          <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
            ${totalVentas.toLocaleString('es-CO')}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: '#a294da' }}>
          <p className="text-sm text-gray-500 mb-1">Pares Vendidos</p>
          <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
            {totalPares}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-500 mb-1">Verificadas</p>
          <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
            {ventasVerificadas}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
          <p className="text-sm text-gray-500 mb-1">Pendientes</p>
          <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
            {ventasPendientes}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('hoy')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'hoy'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={{ backgroundColor: filter === 'hoy' ? '#ffe248' : undefined, color: filter === 'hoy' ? '#0e0142' : undefined }}
            >
              Hoy
            </button>
            <button
              onClick={() => setFilter('semana')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'semana'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={{ backgroundColor: filter === 'semana' ? '#ffe248' : undefined, color: filter === 'semana' ? '#0e0142' : undefined }}
            >
              Última Semana
            </button>
            <button
              onClick={() => setFilter('mes')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'mes'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={{ backgroundColor: filter === 'mes' ? '#ffe248' : undefined, color: filter === 'mes' ? '#0e0142' : undefined }}
            >
              Último Mes
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'all'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={{ backgroundColor: filter === 'all' ? '#ffe248' : undefined, color: filter === 'all' ? '#0e0142' : undefined }}
            >
              Todas
            </button>
          </div>

          <div className="flex-1 md:max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por factura, cliente, cédula, vendedor..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 transition"
                style={{ focusRingColor: '#ffe248' }}
              />
              <span className="absolute left-3 top-2.5 text-gray-400 text-lg">
                🔍
              </span>
              {searchTerm && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ventas Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {ventasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-500">
              {searchTerm ? 'No se encontraron ventas con ese criterio de búsqueda' : 'No hay ventas registradas en este período'}
            </p>
            {searchTerm && (
              <button
                onClick={() => handleSearch('')}
                className="mt-4 px-4 py-2 rounded-lg transition hover:opacity-80"
                style={{ backgroundColor: '#ffe248', color: '#0e0142' }}
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead style={{ backgroundColor: '#f8f9fa' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nº Factura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ventasFiltradas.map((venta) => (
                  <tr key={venta.id} className={!venta.verificada ? 'bg-orange-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#0e0142' }}>
                      <span className="font-mono font-semibold px-2 py-1 bg-purple-50 rounded" style={{ color: '#6f4ec8' }}>
                        {venta.numero_factura || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#0e0142' }}>
                      <div>
                        <div className="font-medium">{new Date(venta.fecha).toLocaleDateString('es-CO')}</div>
                        <div className="text-gray-500">{venta.hora}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#0e0142' }}>
                      {venta.vendedor_nombre}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: '#0e0142' }}>
                      {venta.nombre_cliente ? (
                        <div>
                          <div className="font-medium">{venta.nombre_cliente}</div>
                          {venta.cedula_cliente && (
                            <div className="text-xs text-gray-500 font-mono">CC: {venta.cedula_cliente}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin datos</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#0e0142' }}>
                      {venta.cantidad_pares} pares
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold" style={{ color: '#0e0142' }}>
                      ${venta.total.toLocaleString('es-CO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#0e0142' }}>
                      <span className="px-2 py-1 rounded-full text-xs" style={{
                        backgroundColor: venta.metodo_pago === 'efectivo' ? '#fff9e6' : '#f3f1fa',
                        color: venta.metodo_pago === 'efectivo' ? '#d4a600' : '#6f4ec8'
                      }}>
                        {venta.metodo_pago === 'efectivo' ? '💵 Efectivo' : '💳 Digital'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {venta.verificada ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          ✓ Verificada
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                          ⏳ Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {venta.factura_url && (
                          <button
                            onClick={() => handleVerFactura(venta.factura_url)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Ver factura"
                          >
                            📄
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/admin/ventas/${venta.id}`)}
                          className="hover:underline"
                          style={{ color: '#a294da' }}
                        >
                          Ver detalles
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 rounded-2xl p-4" style={{ backgroundColor: '#fff9e6', border: '1px solid #ffe248' }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: '#0e0142' }}>ℹ️ Información</h3>
        <ul className="text-sm space-y-1" style={{ color: '#5a4a0a' }}>
          <li>• Las ventas son registradas por los vendedores desde sus dispositivos</li>
          <li>• Las ventas pendientes requieren tu verificación antes de ser confirmadas</li>
          <li>• Las ventas en efectivo se suman automáticamente a la caja</li>
          <li>• Click en "Ver detalles" para revisar y verificar una venta</li>
        </ul>
      </div>
    </div>
  )
}
