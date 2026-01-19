'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatFechaLocal } from '@/lib/utils/dates'

interface CompraDetalle {
  id: string
  producto_id: string
  cantidad_pares: number
  precio_unitario: number
  subtotal: number
  productos: {
    codigo: string
    tipo: string
    talla: string
  }
}

interface Compra {
  id: string
  fecha: string
  hora: string
  proveedor: string
  total: number
  documento_url: string | null
  documento_nombre: string | null
  observaciones: string | null
  estado: string
  registrado_por: string
  usuarios: {
    nombre: string
  }
  compras_detalle: CompraDetalle[]
}

export default function PorRecibirPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [compras, setCompras] = useState<Compra[]>([])
  const [compraExpandida, setCompraExpandida] = useState<string | null>(null)

  useEffect(() => {
    cargarComprasPendientes()
  }, [])

  const cargarComprasPendientes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('compras')
        .select(`
          *,
          compras_detalle(
            *,
            productos(codigo, tipo, talla)
          )
        `)
        .eq('estado', 'por_recibir')
        .order('fecha', { ascending: false })

      if (error) {
        console.error('Error en query de compras:', error)
        throw error
      }

      // Obtener nombres de usuarios por separado
      if (data && data.length > 0) {
        const usuarioIds = data.map(c => c.registrado_por).filter(Boolean)
        const { data: usuarios } = await supabase
          .from('usuarios')
          .select('id, nombre')
          .in('id', usuarioIds)

        // Mapear usuarios a las compras
        const usuariosMap = new Map(usuarios?.map(u => [u.id, u]) || [])
        const comprasConUsuarios = data.map(compra => ({
          ...compra,
          usuarios: usuariosMap.get(compra.registrado_por) || { nombre: 'Usuario desconocido' }
        }))

        setCompras(comprasConUsuarios)
      } else {
        setCompras([])
      }
    } catch (error) {
      console.error('Error cargando compras pendientes:', error)
      setCompras([])
    } finally {
      setLoading(false)
    }
  }

  const aprobarLlegada = async (compra: Compra) => {
    const confirmar = confirm(
      `¿Confirmar que llegó la compra de ${compra.proveedor} por $${compra.total.toLocaleString('es-CO')}?\n\nEsto actualizará el inventario automáticamente.`
    )

    if (!confirmar) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      // Obtener el ID del usuario en la tabla usuarios usando auth_id
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (usuarioError) throw new Error(`No se encontró el usuario: ${usuarioError.message}`)
      if (!usuario) throw new Error('Usuario no encontrado en la tabla usuarios')

      // Actualizar estado de la compra
      const { error: compraError } = await supabase
        .from('compras')
        .update({
          estado: 'recibido',
          aprobado_por: user.id,
          fecha_aprobacion: new Date().toISOString()
        })
        .eq('id', compra.id)

      if (compraError) throw compraError

      // Actualizar inventario para cada producto
      for (const detalle of compra.compras_detalle) {
        // Obtener stock actual
        const { data: producto, error: productoError } = await supabase
          .from('productos')
          .select('stock_normal')
          .eq('id', detalle.producto_id)
          .single()

        if (productoError) throw productoError

        const stockAnterior = producto.stock_normal
        const nuevoStock = stockAnterior + detalle.cantidad_pares

        // Actualizar stock
        const { error: updateError } = await supabase
          .from('productos')
          .update({ stock_normal: nuevoStock })
          .eq('id', detalle.producto_id)

        if (updateError) throw updateError

        // Registrar movimiento de inventario
        const ahora = new Date()
        const fecha = ahora.toISOString().split('T')[0]
        const hora = ahora.toTimeString().split(' ')[0]

        const { error: movError } = await supabase
          .from('movimientos_inventario')
          .insert({
            fecha,
            hora,
            producto_id: detalle.producto_id,
            tipo: 'entrada',
            cantidad: detalle.cantidad_pares,
            stock_anterior: stockAnterior,
            stock_nuevo: nuevoStock,
            referencia: `Compra ${compra.id}`,
            usuario_id: usuario.id, // Usar el ID de la tabla usuarios
            observaciones: `Compra recibida - ${compra.proveedor}`
          })

        if (movError) throw movError
      }

      alert('Compra aprobada e inventario actualizado exitosamente')
      await cargarComprasPendientes()
    } catch (error: any) {
      console.error('Error aprobando compra:', error)
      console.error('Error detalles:', JSON.stringify(error, null, 2))
      alert(`Error al aprobar la compra: ${error.message || JSON.stringify(error)}`)
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
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/admin/compras')}
          className="mb-4 px-4 py-2 rounded-lg font-medium transition hover:opacity-90"
          style={{ backgroundColor: '#e5e7eb', color: '#0e0142' }}
        >
          ← Regresar a Compras
        </button>
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#0e0142' }}>
          Por Recibir
        </h1>
        <p className="text-gray-600">
          Compras pendientes de llegada. Aprueba cuando lleguen para actualizar el inventario.
        </p>
      </div>

      {/* Lista de Compras Pendientes */}
      {compras.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#0e0142' }}>
            No hay compras pendientes
          </h2>
          <p className="text-gray-600 mb-6">
            Todas las compras han sido recibidas
          </p>
          <a
            href="/admin/compras"
            className="inline-block px-6 py-3 rounded-lg font-medium transition hover:opacity-90"
            style={{ backgroundColor: '#ffe248', color: '#0e0142' }}
          >
            + Registrar Nueva Compra
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {compras.map(compra => (
            <div key={compra.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Header de la Compra */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold" style={{ color: '#0e0142' }}>
                        {compra.proveedor}
                      </h3>
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#fff9e6', color: '#d4a700' }}>
                        Pendiente
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Registrado por {compra.usuarios?.nombre} el {formatFechaLocal(compra.fecha)} a las {compra.hora}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
                      ${compra.total.toLocaleString('es-CO')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {compra.compras_detalle.length} producto(s)
                    </p>
                  </div>
                </div>

                {/* Resumen de Referencias y Pares */}
                <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#f5f3ff', border: '1px solid #e9d5ff' }}>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#0e0142' }}>
                        Referencias únicas
                      </p>
                      <p className="text-2xl font-bold" style={{ color: '#a294da' }}>
                        {new Set(compra.compras_detalle.map(d => d.productos.codigo)).size}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#0e0142' }}>
                        Total de pares
                      </p>
                      <p className="text-2xl font-bold" style={{ color: '#a294da' }}>
                        {compra.compras_detalle.reduce((sum, d) => sum + d.cantidad_pares, 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Documento y Observaciones */}
                {(compra.documento_url || compra.observaciones) && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    {compra.documento_url && (
                      <div className="mb-2">
                        <a
                          href={compra.documento_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline"
                          style={{ color: '#a294da' }}
                        >
                          📄 Ver documento: {compra.documento_nombre}
                        </a>
                      </div>
                    )}
                    {compra.observaciones && (
                      <p className="text-sm text-gray-600">
                        <strong>Observaciones:</strong> {compra.observaciones}
                      </p>
                    )}
                  </div>
                )}

                {/* Botón Expandir Detalle */}
                <button
                  onClick={() => setCompraExpandida(compraExpandida === compra.id ? null : compra.id)}
                  className="w-full px-4 py-2 mb-4 rounded-lg border-2 font-medium transition hover:bg-gray-50"
                  style={{ borderColor: '#a294da', color: '#a294da' }}
                >
                  {compraExpandida === compra.id ? '▼ Ocultar Detalle' : '▶ Ver Detalle de Productos'}
                </button>

                {/* Detalle de Productos (Expandible) */}
                {compraExpandida === compra.id && (
                  <div className="mb-4 space-y-2">
                    {compra.compras_detalle.map(detalle => (
                      <div key={detalle.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium" style={{ color: '#0e0142' }}>
                              {detalle.productos.tipo.charAt(0).toUpperCase() + detalle.productos.tipo.slice(1)} {detalle.productos.talla} ({detalle.productos.codigo})
                            </p>
                            <p className="text-sm text-gray-600">
                              Código: {detalle.productos.codigo}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium" style={{ color: '#0e0142' }}>
                              {detalle.cantidad_pares} pares
                            </p>
                            <p className="text-sm text-gray-600">
                              ${detalle.precio_unitario.toLocaleString('es-CO')} c/u = ${detalle.subtotal.toLocaleString('es-CO')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botón Aprobar */}
                <button
                  onClick={() => aprobarLlegada(compra)}
                  disabled={loading}
                  className="w-full px-6 py-3 rounded-lg font-bold transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#ffe248', color: '#0e0142' }}
                >
                  ✅ Aprobar Llegada y Actualizar Inventario
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
