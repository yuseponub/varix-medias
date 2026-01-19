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

interface Gasto {
  id: string
  fecha: string
  hora: string
  concepto: string
  monto: number
  categoria: string | null
  observaciones: string | null
  documento_url: string | null
  documento_nombre: string | null
  estado: string
  registrado_por: string
  usuarios: {
    nombre: string
  }
}

type HistorialItem = (Compra | Gasto) & { tipo: 'compra' | 'gasto' }

export default function ComprasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [comprasPorRecibir, setComprasPorRecibir] = useState<Compra[]>([])
  const [compraExpandida, setCompraExpandida] = useState<string | null>(null)
  const [historial, setHistorial] = useState<HistorialItem[]>([])

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      // Cargar compras por recibir
      const { data: comprasPendientes, error: comprasError } = await supabase
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

      if (comprasError) throw comprasError

      // Obtener usuarios para compras pendientes
      if (comprasPendientes && comprasPendientes.length > 0) {
        const usuarioIds = comprasPendientes.map(c => c.registrado_por).filter(Boolean)
        const { data: usuarios } = await supabase
          .from('usuarios')
          .select('id, nombre')
          .in('id', usuarioIds)

        const usuariosMap = new Map(usuarios?.map(u => [u.id, u]) || [])
        const comprasConUsuarios = comprasPendientes.map(compra => ({
          ...compra,
          usuarios: usuariosMap.get(compra.registrado_por) || { nombre: 'Usuario desconocido' }
        }))
        setComprasPorRecibir(comprasConUsuarios)
      } else {
        setComprasPorRecibir([])
      }

      // Cargar historial de compras recibidas
      const { data: comprasRecibidas, error: comprasRecibidasError } = await supabase
        .from('compras')
        .select(`
          *,
          compras_detalle(
            *,
            productos(codigo, tipo, talla)
          )
        `)
        .eq('estado', 'recibido')
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (comprasRecibidasError) throw comprasRecibidasError

      // Cargar historial de gastos extra (todos los estados)
      const { data: gastos, error: gastosError } = await supabase
        .from('gastos_extra')
        .select(`
          *,
          usuarios:registrado_por(nombre)
        `)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (gastosError) throw gastosError

      // Obtener usuarios para compras recibidas y gastos
      const todosUsuarioIds = [
        ...(comprasRecibidas?.map(c => c.registrado_por) || []),
      ].filter(Boolean)

      const { data: todosUsuarios } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .in('id', todosUsuarioIds)

      const todosUsuariosMap = new Map(todosUsuarios?.map(u => [u.id, u]) || [])

      // Combinar historial
      const comprasFormateadas: HistorialItem[] = (comprasRecibidas || []).map(compra => ({
        ...compra,
        tipo: 'compra' as const,
        usuarios: todosUsuariosMap.get(compra.registrado_por) || { nombre: 'Usuario desconocido' }
      }))

      const gastosFormateados: HistorialItem[] = (gastos || []).map(gasto => ({
        ...gasto,
        tipo: 'gasto' as const
      }))

      // Combinar y ordenar por fecha y hora
      const historialCombinado = [...comprasFormateadas, ...gastosFormateados].sort((a, b) => {
        const dateA = new Date(`${a.fecha}T${a.hora}`)
        const dateB = new Date(`${b.fecha}T${b.hora}`)
        return dateB.getTime() - dateA.getTime()
      })

      setHistorial(historialCombinado)
    } catch (error) {
      console.error('Error cargando datos:', error)
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

      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (usuarioError || !usuario) throw new Error('Usuario no encontrado')

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
        const { data: producto, error: productoError } = await supabase
          .from('productos')
          .select('stock_normal')
          .eq('id', detalle.producto_id)
          .single()

        if (productoError) throw productoError

        const stockAnterior = producto.stock_normal
        const nuevoStock = stockAnterior + detalle.cantidad_pares

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
            usuario_id: usuario.id,
            observaciones: `Compra recibida - ${compra.proveedor}`
          })

        if (movError) throw movError
      }

      alert('Compra aprobada e inventario actualizado exitosamente')
      await cargarDatos()
    } catch (error: any) {
      console.error('Error aprobando compra:', error)
      alert(`Error al aprobar la compra: ${error.message}`)
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
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#0e0142' }}>
          🛒 Compras
        </h1>
        <p className="text-gray-600">
          Gestiona compras de medias y gastos extra. Aprueba compras pendientes y consulta el historial.
        </p>
      </div>

      {/* Botones de Acción */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => router.push('/admin/registrar-compra')}
          className="px-6 py-4 rounded-lg font-bold transition hover:opacity-90 shadow-lg text-left"
          style={{ backgroundColor: '#ffe248', color: '#0e0142' }}
        >
          <div className="text-2xl mb-1">📦</div>
          <div className="text-lg">Nueva Compra de Medias</div>
          <div className="text-sm opacity-75">Registrar nueva compra de inventario</div>
        </button>

        <button
          onClick={() => router.push('/admin/gastos-extra')}
          className="px-6 py-4 rounded-lg font-bold transition hover:opacity-90 shadow-lg text-left"
          style={{ backgroundColor: '#a294da', color: 'white' }}
        >
          <div className="text-2xl mb-1">💸</div>
          <div className="text-lg">Nuevo Gasto Extra</div>
          <div className="text-sm opacity-90">Facturas, cajas, comisiones, etc.</div>
        </button>
      </div>

      {/* Alerta de Compras Por Recibir */}
      {comprasPorRecibir.length > 0 && (
        <div className="mb-8">
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl shadow-lg p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1" style={{ color: '#d4a700' }}>
                  Compras Pendientes de Recibir ({comprasPorRecibir.length})
                </h2>
                <p className="text-sm text-gray-700">
                  Estas compras están registradas pero no han llegado. Apruébalas cuando lleguen para actualizar el inventario.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {comprasPorRecibir.map(compra => (
                <div key={compra.id} className="bg-white rounded-xl p-4 border border-yellow-300">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1" style={{ color: '#0e0142' }}>
                        {compra.proveedor}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Registrado por {compra.usuarios?.nombre} el {formatFechaLocal(compra.fecha)} a las {compra.hora}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
                        ${compra.total.toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>

                  {/* Resumen */}
                  <div className="flex gap-4 mb-3 p-3 bg-purple-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-600">Referencias únicas</p>
                      <p className="text-lg font-bold" style={{ color: '#a294da' }}>
                        {new Set(compra.compras_detalle.map(d => d.productos.codigo)).size}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Total de pares</p>
                      <p className="text-lg font-bold" style={{ color: '#a294da' }}>
                        {compra.compras_detalle.reduce((sum, d) => sum + d.cantidad_pares, 0)}
                      </p>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCompraExpandida(compraExpandida === compra.id ? null : compra.id)}
                      className="flex-1 px-4 py-2 rounded-lg border-2 font-medium transition hover:bg-gray-50"
                      style={{ borderColor: '#a294da', color: '#a294da' }}
                    >
                      {compraExpandida === compra.id ? '▼ Ocultar Detalle' : '▶ Ver Detalle'}
                    </button>
                    <button
                      onClick={() => aprobarLlegada(compra)}
                      disabled={loading}
                      className="px-6 py-2 rounded-lg font-bold transition hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#ffe248', color: '#0e0142' }}
                    >
                      ✅ Aprobar Llegada
                    </button>
                  </div>

                  {/* Detalle Expandible */}
                  {compraExpandida === compra.id && (
                    <div className="mt-3 space-y-2 p-3 bg-gray-50 rounded-lg">
                      {compra.compras_detalle.map(detalle => (
                        <div key={detalle.id} className="flex justify-between items-start p-2 bg-white rounded">
                          <div>
                            <p className="font-medium" style={{ color: '#0e0142' }}>
                              {detalle.productos.tipo.charAt(0).toUpperCase() + detalle.productos.tipo.slice(1)} {detalle.productos.talla}
                            </p>
                            <p className="text-xs text-gray-600">Código: {detalle.productos.codigo}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium" style={{ color: '#0e0142' }}>
                              {detalle.cantidad_pares} pares
                            </p>
                            <p className="text-xs text-gray-600">
                              ${detalle.precio_unitario.toLocaleString('es-CO')} c/u
                            </p>
                          </div>
                        </div>
                      ))}
                      {compra.observaciones && (
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Observaciones:</strong> {compra.observaciones}
                        </p>
                      )}
                      {compra.documento_url && (
                        <a
                          href={compra.documento_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline inline-block mt-2"
                          style={{ color: '#a294da' }}
                        >
                          📄 Ver documento: {compra.documento_nombre}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Historial Combinado */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#0e0142' }}>
          📋 Historial de Compras y Gastos
        </h2>

        {historial.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-600">No hay historial de compras o gastos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2" style={{ borderColor: '#a294da' }}>
                  <th className="text-left py-3 px-2 font-semibold" style={{ color: '#0e0142' }}>Tipo</th>
                  <th className="text-left py-3 px-2 font-semibold" style={{ color: '#0e0142' }}>Fecha</th>
                  <th className="text-left py-3 px-2 font-semibold" style={{ color: '#0e0142' }}>Descripción</th>
                  <th className="text-left py-3 px-2 font-semibold" style={{ color: '#0e0142' }}>Estado</th>
                  <th className="text-right py-3 px-2 font-semibold" style={{ color: '#0e0142' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((item, index) => (
                  <tr key={`${item.tipo}-${item.id}`} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">
                      {item.tipo === 'compra' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          📦 Compra
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          💸 Gasto
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-600">
                      {formatFechaLocal(item.fecha)}<br/>
                      <span className="text-xs">{item.hora}</span>
                    </td>
                    <td className="py-3 px-2">
                      {item.tipo === 'compra' ? (
                        <div>
                          <p className="font-medium" style={{ color: '#0e0142' }}>
                            {(item as Compra).proveedor}
                          </p>
                          <p className="text-xs text-gray-600">
                            {(item as Compra).compras_detalle?.length} productos, {(item as Compra).compras_detalle?.reduce((sum, d) => sum + d.cantidad_pares, 0)} pares
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium" style={{ color: '#0e0142' }}>
                            {(item as Gasto).concepto}
                          </p>
                          {(item as Gasto).categoria && (
                            <p className="text-xs text-gray-600">
                              {(item as Gasto).categoria}
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Por: {item.usuarios?.nombre}
                      </p>
                    </td>
                    <td className="py-3 px-2">
                      {item.tipo === 'compra' ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          Recibido
                        </span>
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          (item as Gasto).estado === 'pendiente'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {(item as Gasto).estado === 'pendiente' ? 'Pendiente' : 'Aprobado'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <p className="text-lg font-bold" style={{ color: '#0e0142' }}>
                        ${item.tipo === 'compra' ? (item as Compra).total.toLocaleString('es-CO') : (item as Gasto).monto.toLocaleString('es-CO')}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
