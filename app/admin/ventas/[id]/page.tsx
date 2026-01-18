'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'

interface VentaDetalle {
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
  observaciones?: string
}

export default function VentaDetallePage() {
  const router = useRouter()
  const params = useParams()
  const ventaId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [venta, setVenta] = useState<VentaDetalle | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (ventaId) {
      loadVenta()
    }
  }, [ventaId])

  const loadVenta = async () => {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          *,
          usuarios:vendedor_id (nombre)
        `)
        .eq('id', ventaId)
        .single()

      if (error) throw error

      setVenta({
        id: data.id,
        fecha: data.fecha,
        hora: data.hora,
        numero_factura: data.numero_factura,
        nombre_cliente: data.nombre_cliente,
        cedula_cliente: data.cedula_cliente,
        total: data.total,
        cantidad_pares: data.cantidad_pares,
        metodo_pago: data.metodo_pago,
        factura_url: data.factura_url,
        vendedor_nombre: data.usuarios?.nombre || 'Desconocido',
        verificada: data.verificada,
        observaciones: data.observaciones
      })
    } catch (error) {
      console.error('Error cargando venta:', error)
      alert('Error al cargar la venta')
      router.push('/admin/ventas')
    } finally {
      setLoading(false)
    }
  }

  const handleVerificar = async () => {
    if (!venta) return

    const confirmar = confirm('¿Confirmar que esta venta es correcta?')
    if (!confirmar) return

    try {
      setProcessing(true)

      const { error } = await supabase
        .from('ventas')
        .update({ verificada: true } as any)
        .eq('id', venta.id)

      if (error) throw error

      alert('✅ Venta verificada correctamente')
      router.push('/admin/ventas')
    } catch (error) {
      console.error('Error verificando venta:', error)
      alert('Error al verificar la venta')
    } finally {
      setProcessing(false)
    }
  }

  const handleRechazar = async () => {
    if (!venta) return

    const motivo = prompt('¿Por qué rechazas esta venta?\n(opcional)')

    const confirmar = confirm('¿Seguro que quieres rechazar esta venta?\n\nSe eliminará de forma permanente.')
    if (!confirmar) return

    try {
      setProcessing(true)

      // Si es efectivo, restar de la caja
      if (venta.metodo_pago === 'efectivo') {
        const { data: caja } = await supabase
          .from('caja_efectivo')
          .select('saldo_actual')
          .eq('id', 1)
          .single()

        if (caja) {
          await supabase
            .from('caja_efectivo')
            .update({
              saldo_actual: caja.saldo_actual - venta.total,
              updated_at: new Date().toISOString()
            } as any)
            .eq('id', 1)
        }
      }

      // Eliminar venta
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('id', venta.id)

      if (error) throw error

      alert(`❌ Venta rechazada y eliminada${motivo ? `\nMotivo: ${motivo}` : ''}`)
      router.push('/admin/ventas')
    } catch (error) {
      console.error('Error rechazando venta:', error)
      alert('Error al rechazar la venta')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#ffe248' }}></div>
          <p className="mt-4" style={{ color: '#0e0142' }}>Cargando venta...</p>
        </div>
      </div>
    )
  }

  if (!venta) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Venta no encontrada</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#0e0142' }}>
            Detalle de Venta
          </h1>
          <p className="text-gray-600">
            Verifica la información antes de aprobar
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/ventas')}
          className="px-4 py-2 rounded-lg hover:bg-gray-100 transition"
          style={{ color: '#0e0142' }}
        >
          ← Volver
        </button>
      </div>

      {/* Status Badge */}
      <div className="mb-8">
        {venta.verificada ? (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-800 font-medium">
            <span>✓</span>
            Venta Verificada
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-800 font-medium">
            <span>⏳</span>
            Pendiente de Verificación
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Factura Image */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="font-bold text-xl mb-4" style={{ color: '#0e0142' }}>
            📸 Factura
          </h2>
          {venta.factura_url ? (
            <div>
              <img
                src={venta.factura_url}
                alt="Factura"
                className="w-full rounded-xl shadow-md cursor-pointer hover:opacity-90 transition"
                onClick={() => window.open(venta.factura_url, '_blank')}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Click para ver en tamaño completo
              </p>
            </div>
          ) : (
            <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center">
              <p className="text-gray-400">Sin foto de factura</p>
            </div>
          )}
        </div>

        {/* Venta Info */}
        <div className="space-y-6">
          {/* Datos principales */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="font-bold text-xl mb-4" style={{ color: '#0e0142' }}>
              📋 Información de la Venta
            </h2>
            <div className="space-y-3">
              {venta.numero_factura && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Nº Factura</span>
                  <span className="font-mono font-bold text-lg px-3 py-1 rounded" style={{ backgroundColor: '#f3f1fa', color: '#6f4ec8' }}>
                    {venta.numero_factura}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Fecha</span>
                <span className="font-semibold" style={{ color: '#0e0142' }}>
                  {new Date(venta.fecha).toLocaleDateString('es-CO', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Hora</span>
                <span className="font-semibold" style={{ color: '#0e0142' }}>
                  {venta.hora}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Vendedor</span>
                <span className="font-semibold" style={{ color: '#0e0142' }}>
                  {venta.vendedor_nombre}
                </span>
              </div>
              {venta.nombre_cliente && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Cliente</span>
                  <span className="font-semibold" style={{ color: '#0e0142' }}>
                    {venta.nombre_cliente}
                  </span>
                </div>
              )}
              {venta.cedula_cliente && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Cédula Cliente</span>
                  <span className="font-mono font-semibold" style={{ color: '#0e0142' }}>
                    {venta.cedula_cliente}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Cantidad de Pares</span>
                <span className="font-semibold text-xl" style={{ color: '#0e0142' }}>
                  {venta.cantidad_pares}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Total</span>
                <span className="font-bold text-2xl" style={{ color: '#ffe248', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
                  ${venta.total.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Método de Pago</span>
                <span className="px-3 py-1 rounded-full text-sm font-medium" style={{
                  backgroundColor: venta.metodo_pago === 'efectivo' ? '#fff9e6' : '#f3f1fa',
                  color: venta.metodo_pago === 'efectivo' ? '#d4a600' : '#6f4ec8'
                }}>
                  {venta.metodo_pago === 'efectivo' ? '💵 Efectivo' : '💳 Digital'}
                </span>
              </div>
              {venta.observaciones && (
                <div className="py-2">
                  <span className="text-gray-600 block mb-1">Observaciones</span>
                  <p className="text-sm p-3 bg-gray-50 rounded-lg" style={{ color: '#0e0142' }}>
                    {venta.observaciones}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {!venta.verificada && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="font-bold text-xl mb-4" style={{ color: '#0e0142' }}>
                ⚡ Acciones
              </h2>
              <div className="space-y-3">
                <button
                  onClick={handleVerificar}
                  disabled={processing}
                  className="w-full py-3 rounded-xl font-bold transition disabled:opacity-50"
                  style={{ backgroundColor: '#4ade80', color: 'white' }}
                >
                  ✓ Verificar Venta
                </button>
                <button
                  onClick={handleRechazar}
                  disabled={processing}
                  className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition disabled:opacity-50"
                >
                  ✗ Rechazar Venta
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Al verificar, la venta se confirma. Al rechazar, se elimina permanentemente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
