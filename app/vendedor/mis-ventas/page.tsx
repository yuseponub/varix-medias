'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Venta {
  id: string
  fecha: string
  hora: string
  total: number
  cantidad_pares: number
  metodo_pago: string
  verificada: boolean
}

export default function MisVentasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [ventas, setVentas] = useState<Venta[]>([])

  useEffect(() => {
    loadVentas()
  }, [])

  const loadVentas = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_id', session.user.id)
        .single()

      if (!usuario) return

      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .eq('vendedor_id', usuario.id)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (error) throw error

      setVentas(data || [])
    } catch (error) {
      console.error('Error cargando ventas:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalVentas = ventas.reduce((sum, v) => sum + v.total, 0)
  const ventasVerificadas = ventas.filter(v => v.verificada).length
  const ventasPendientes = ventas.filter(v => !v.verificada).length

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
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#0e0142' }}>
          📊 Mis Ventas
        </h1>
        <p className="text-sm text-gray-600">
          Historial de tus ventas registradas
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className="text-lg font-bold" style={{ color: '#0e0142' }}>
            ${totalVentas.toLocaleString('es-CO')}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Verificadas</p>
          <p className="text-lg font-bold text-green-600">
            {ventasVerificadas}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Pendientes</p>
          <p className="text-lg font-bold text-orange-600">
            {ventasPendientes}
          </p>
        </div>
      </div>

      {/* Ventas List */}
      <div className="space-y-3">
        {ventas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-gray-500">No has registrado ventas aún</p>
          </div>
        ) : (
          ventas.map((venta) => (
            <div
              key={venta.id}
              className="bg-white rounded-xl shadow-lg p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold" style={{ color: '#0e0142' }}>
                    {new Date(venta.fecha).toLocaleDateString('es-CO')}
                  </div>
                  <div className="text-sm text-gray-500">{venta.hora}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold" style={{ color: '#ffe248', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
                    ${venta.total.toLocaleString('es-CO')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {venta.cantidad_pares} pares
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                  backgroundColor: venta.metodo_pago === 'efectivo' ? '#fff9e6' : '#f3f1fa',
                  color: venta.metodo_pago === 'efectivo' ? '#d4a600' : '#6f4ec8'
                }}>
                  {venta.metodo_pago === 'efectivo' ? '💵 Efectivo' : '💳 Digital'}
                </span>

                {venta.verificada ? (
                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    ✓ Verificada
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                    ⏳ Pendiente
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
