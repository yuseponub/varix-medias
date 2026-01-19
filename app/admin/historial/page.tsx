'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatFechaLocal } from '@/lib/utils/dates'

interface HistorialItem {
  id: string
  fecha: string
  hora: string
  tipo: 'venta' | 'devolucion' | 'compra' | 'gasto' | 'recogida' | 'cierre'
  descripcion: string
  monto: number
  usuario: string
  estado?: string
  detalles?: any
}

type FiltroTipo = 'todos' | 'venta' | 'devolucion' | 'compra' | 'gasto' | 'recogida' | 'cierre'

export default function HistorialPage() {
  const [loading, setLoading] = useState(true)
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [itemExpandido, setItemExpandido] = useState<string | null>(null)

  useEffect(() => {
    cargarHistorial()
  }, [])

  const cargarHistorial = async () => {
    setLoading(true)
    try {
      const items: HistorialItem[] = []

      // 1. Cargar Ventas
      const { data: ventas, error: ventasError } = await supabase
        .from('ventas')
        .select(`
          *,
          pacientes(nombre, cedula),
          usuarios(nombre)
        `)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (!ventasError && ventas) {
        for (const venta of ventas) {
          // Obtener usuario por auth_id si no viene en el join
          let usuarioNombre = venta.usuarios?.nombre
          if (!usuarioNombre && venta.registrado_por) {
            const { data: usuario } = await supabase
              .from('usuarios')
              .select('nombre')
              .eq('auth_id', venta.registrado_por)
              .single()
            usuarioNombre = usuario?.nombre || 'Usuario desconocido'
          }

          items.push({
            id: venta.id,
            fecha: venta.fecha,
            hora: venta.hora,
            tipo: 'venta',
            descripcion: `Venta #${venta.numero_factura} - ${venta.pacientes?.nombre || 'Cliente'}`,
            monto: venta.valor_total,
            usuario: usuarioNombre || 'Desconocido',
            estado: venta.estado,
            detalles: {
              numero_factura: venta.numero_factura,
              cliente: venta.pacientes?.nombre,
              cedula: venta.pacientes?.cedula,
              metodo_pago: venta.metodo_pago,
              comprobante_url: venta.comprobante_url
            }
          })
        }
      }

      // 2. Cargar Devoluciones
      const { data: devoluciones, error: devolucionesError } = await supabase
        .from('devoluciones')
        .select(`
          *,
          ventas!devoluciones_venta_id_fkey(numero_factura),
          usuarios(nombre)
        `)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (!devolucionesError && devoluciones) {
        for (const devolucion of devoluciones) {
          let usuarioNombre = devolucion.usuarios?.nombre
          if (!usuarioNombre && devolucion.registrado_por) {
            const { data: usuario } = await supabase
              .from('usuarios')
              .select('nombre')
              .eq('auth_id', devolucion.registrado_por)
              .single()
            usuarioNombre = usuario?.nombre || 'Usuario desconocido'
          }

          items.push({
            id: devolucion.id,
            fecha: devolucion.fecha,
            hora: devolucion.hora,
            tipo: 'devolucion',
            descripcion: `Devolución - Venta #${devolucion.ventas?.numero_factura || 'N/A'}`,
            monto: -devolucion.monto_devuelto,
            usuario: usuarioNombre || 'Desconocido',
            estado: devolucion.estado,
            detalles: {
              motivo: devolucion.motivo,
              referencia_producto: devolucion.referencia_producto,
              documento_url: devolucion.documento_url
            }
          })
        }
      }

      // 3. Cargar Compras (recibidas)
      const { data: compras, error: comprasError } = await supabase
        .from('compras')
        .select(`
          *,
          usuarios!compras_registrado_por_fkey(nombre)
        `)
        .eq('estado', 'recibido')
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (!comprasError && compras) {
        for (const compra of compras) {
          let usuarioNombre = compra.usuarios?.nombre
          if (!usuarioNombre && compra.registrado_por) {
            const { data: usuario } = await supabase
              .from('usuarios')
              .select('nombre')
              .eq('id', compra.registrado_por)
              .single()
            usuarioNombre = usuario?.nombre || 'Usuario desconocido'
          }

          items.push({
            id: compra.id,
            fecha: compra.fecha,
            hora: compra.hora,
            tipo: 'compra',
            descripcion: `Compra - ${compra.proveedor}`,
            monto: -compra.total,
            usuario: usuarioNombre || 'Desconocido',
            estado: compra.estado,
            detalles: {
              proveedor: compra.proveedor,
              documento_url: compra.documento_url,
              observaciones: compra.observaciones
            }
          })
        }
      }

      // 4. Cargar Gastos Extra
      const { data: gastos, error: gastosError } = await supabase
        .from('gastos_extra')
        .select(`
          *,
          usuarios(nombre)
        `)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (!gastosError && gastos) {
        for (const gasto of gastos) {
          let usuarioNombre = gasto.usuarios?.nombre
          if (!usuarioNombre && gasto.registrado_por) {
            const { data: usuario } = await supabase
              .from('usuarios')
              .select('nombre')
              .eq('id', gasto.registrado_por)
              .single()
            usuarioNombre = usuario?.nombre || 'Usuario desconocido'
          }

          items.push({
            id: gasto.id,
            fecha: gasto.fecha,
            hora: gasto.hora,
            tipo: 'gasto',
            descripcion: `Gasto Extra - ${gasto.concepto}`,
            monto: -gasto.monto,
            usuario: usuarioNombre || 'Desconocido',
            detalles: {
              concepto: gasto.concepto,
              recibo_url: gasto.recibo_url,
              observaciones: gasto.observaciones
            }
          })
        }
      }

      // 5. Cargar Recogidas de Efectivo
      const { data: recogidas, error: recogidasError } = await supabase
        .from('recogidas_efectivo')
        .select(`
          *,
          usuarios(nombre)
        `)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (!recogidasError && recogidas) {
        for (const recogida of recogidas) {
          let usuarioNombre = recogida.usuarios?.nombre
          if (!usuarioNombre && recogida.realizado_por) {
            const { data: usuario } = await supabase
              .from('usuarios')
              .select('nombre')
              .eq('id', recogida.realizado_por)
              .single()
            usuarioNombre = usuario?.nombre || 'Usuario desconocido'
          }

          items.push({
            id: recogida.id,
            fecha: recogida.fecha,
            hora: recogida.hora,
            tipo: 'recogida',
            descripcion: `Recogida de Efectivo`,
            monto: -recogida.monto_recogido,
            usuario: usuarioNombre || 'Desconocido',
            detalles: {
              monto_recogido: recogida.monto_recogido,
              monto_dejado: recogida.monto_dejado,
              observaciones: recogida.observaciones
            }
          })
        }
      }

      // 6. Cargar Cierres de Caja
      const { data: cierres, error: cierresError } = await supabase
        .from('cierres_caja')
        .select(`
          *,
          usuarios(nombre)
        `)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (!cierresError && cierres) {
        for (const cierre of cierres) {
          let usuarioNombre = cierre.usuarios?.nombre
          if (!usuarioNombre && cierre.realizado_por) {
            const { data: usuario } = await supabase
              .from('usuarios')
              .select('nombre')
              .eq('id', cierre.realizado_por)
              .single()
            usuarioNombre = usuario?.nombre || 'Usuario desconocido'
          }

          items.push({
            id: cierre.id,
            fecha: cierre.fecha,
            hora: cierre.hora,
            tipo: 'cierre',
            descripcion: `Cierre de Caja`,
            monto: cierre.efectivo_contado,
            usuario: usuarioNombre || 'Desconocido',
            detalles: {
              efectivo_sistema: cierre.efectivo_sistema,
              efectivo_contado: cierre.efectivo_contado,
              diferencia: cierre.diferencia,
              observaciones: cierre.observaciones
            }
          })
        }
      }

      // Ordenar por fecha y hora (más reciente primero)
      items.sort((a, b) => {
        const fechaA = new Date(`${a.fecha}T${a.hora}`)
        const fechaB = new Date(`${b.fecha}T${b.hora}`)
        return fechaB.getTime() - fechaA.getTime()
      })

      setHistorial(items)
    } catch (error) {
      console.error('Error cargando historial:', error)
      setHistorial([])
    } finally {
      setLoading(false)
    }
  }

  const historialFiltrado = historial.filter(item => {
    // Filtro por tipo
    if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false

    // Filtro por rango de fechas
    if (fechaInicio && item.fecha < fechaInicio) return false
    if (fechaFin && item.fecha > fechaFin) return false

    // Filtro por búsqueda
    if (busqueda) {
      const termino = busqueda.toLowerCase()
      return (
        item.descripcion.toLowerCase().includes(termino) ||
        item.usuario.toLowerCase().includes(termino) ||
        item.id.toLowerCase().includes(termino) ||
        JSON.stringify(item.detalles).toLowerCase().includes(termino)
      )
    }

    return true
  })

  const obtenerIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'venta': return '💰'
      case 'devolucion': return '↩️'
      case 'compra': return '🛒'
      case 'gasto': return '💸'
      case 'recogida': return '🏦'
      case 'cierre': return '🔒'
      default: return '📄'
    }
  }

  const obtenerColorTipo = (tipo: string) => {
    switch (tipo) {
      case 'venta': return { bg: '#e8f5e9', text: '#2e7d32' }
      case 'devolucion': return { bg: '#fff3e0', text: '#ef6c00' }
      case 'compra': return { bg: '#e3f2fd', text: '#1565c0' }
      case 'gasto': return { bg: '#fce4ec', text: '#c2185b' }
      case 'recogida': return { bg: '#f3e5f5', text: '#7b1fa2' }
      case 'cierre': return { bg: '#e0f2f1', text: '#00695c' }
      default: return { bg: '#f5f5f5', text: '#616161' }
    }
  }

  const obtenerColorMonto = (monto: number) => {
    return monto >= 0 ? '#2e7d32' : '#c62828'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#ffe248' }}></div>
          <p className="mt-4" style={{ color: '#0e0142' }}>Cargando historial...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#0e0142' }}>
          📜 Historial Completo
        </h1>
        <p className="text-gray-600">
          Registro completo de todas las operaciones del sistema
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: '#0e0142' }}>
          Filtros
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filtro por Tipo */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
              Tipo de Operación
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
              className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none"
              style={{ borderColor: '#a294da' }}
            >
              <option value="todos">Todas</option>
              <option value="venta">Ventas</option>
              <option value="devolucion">Devoluciones</option>
              <option value="compra">Compras</option>
              <option value="gasto">Gastos Extra</option>
              <option value="recogida">Recogidas</option>
              <option value="cierre">Cierres de Caja</option>
            </select>
          </div>

          {/* Fecha Inicio */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
              Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none"
              style={{ borderColor: '#a294da' }}
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
              Fecha Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none"
              style={{ borderColor: '#a294da' }}
            />
          </div>

          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
              Buscar
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nº factura, cliente, usuario..."
              className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none"
              style={{ borderColor: '#a294da' }}
            />
          </div>
        </div>

        {/* Botón Limpiar Filtros */}
        {(filtroTipo !== 'todos' || fechaInicio || fechaFin || busqueda) && (
          <button
            onClick={() => {
              setFiltroTipo('todos')
              setFechaInicio('')
              setFechaFin('')
              setBusqueda('')
            }}
            className="mt-4 px-4 py-2 rounded-lg font-medium transition hover:opacity-90"
            style={{ backgroundColor: '#e5e7eb', color: '#0e0142' }}
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* Resumen */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Operaciones</p>
            <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
              {historialFiltrado.length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Ingresos</p>
            <p className="text-2xl font-bold" style={{ color: '#2e7d32' }}>
              ${historialFiltrado.filter(i => i.monto > 0).reduce((sum, i) => sum + i.monto, 0).toLocaleString('es-CO')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Egresos</p>
            <p className="text-2xl font-bold" style={{ color: '#c62828' }}>
              ${Math.abs(historialFiltrado.filter(i => i.monto < 0).reduce((sum, i) => sum + i.monto, 0)).toLocaleString('es-CO')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Neto</p>
            <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
              ${historialFiltrado.reduce((sum, i) => sum + i.monto, 0).toLocaleString('es-CO')}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Operaciones */}
      {historialFiltrado.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#0e0142' }}>
            No hay operaciones
          </h2>
          <p className="text-gray-600">
            No se encontraron operaciones con los filtros aplicados
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#f5f3ff' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold" style={{ color: '#0e0142' }}>Fecha/Hora</th>
                  <th className="px-4 py-3 text-left text-sm font-bold" style={{ color: '#0e0142' }}>Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-bold" style={{ color: '#0e0142' }}>Descripción</th>
                  <th className="px-4 py-3 text-left text-sm font-bold" style={{ color: '#0e0142' }}>Usuario</th>
                  <th className="px-4 py-3 text-right text-sm font-bold" style={{ color: '#0e0142' }}>Monto</th>
                  <th className="px-4 py-3 text-center text-sm font-bold" style={{ color: '#0e0142' }}>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {historialFiltrado.map((item, index) => {
                  const color = obtenerColorTipo(item.tipo)
                  const isExpanded = itemExpandido === item.id

                  return (
                    <>
                      <tr
                        key={item.id}
                        className="border-t hover:bg-gray-50 transition"
                        style={{ borderColor: '#e5e7eb' }}
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium" style={{ color: '#0e0142' }}>
                            {formatFechaLocal(item.fecha)}
                          </div>
                          <div className="text-xs text-gray-600">{item.hora}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: color.bg, color: color.text }}
                          >
                            {obtenerIconoTipo(item.tipo)} {item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm" style={{ color: '#0e0142' }}>{item.descripcion}</div>
                          {item.estado && (
                            <div className="text-xs text-gray-600">Estado: {item.estado}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-700">{item.usuario}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div
                            className="text-sm font-bold"
                            style={{ color: obtenerColorMonto(item.monto) }}
                          >
                            {item.monto >= 0 ? '+' : ''}${Math.abs(item.monto).toLocaleString('es-CO')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setItemExpandido(isExpanded ? null : item.id)}
                            className="px-3 py-1 text-xs rounded-lg font-medium transition hover:opacity-80"
                            style={{ backgroundColor: '#a294da', color: 'white' }}
                          >
                            {isExpanded ? 'Ocultar' : 'Ver'}
                          </button>
                        </td>
                      </tr>

                      {/* Fila Expandida con Detalles */}
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="space-y-2">
                              <h3 className="font-bold text-sm" style={{ color: '#0e0142' }}>Detalles Adicionales:</h3>
                              {Object.entries(item.detalles || {}).map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="text-sm font-medium" style={{ color: '#0e0142' }}>
                                    {key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}:
                                  </span>
                                  <span className="text-sm text-gray-700">
                                    {typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://')) ? (
                                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        Ver documento
                                      </a>
                                    ) : (
                                      String(value || 'N/A')
                                    )}
                                  </span>
                                </div>
                              ))}
                              <div className="mt-2 text-xs text-gray-500">
                                ID: {item.id}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
