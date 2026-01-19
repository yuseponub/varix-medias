'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ResumenVentas {
  efectivo: number
  tarjeta: number
  transferencia: number
  total: number
  cantidad_ventas: number
}

interface Devolucion {
  id: string
  fecha: string
  hora: string
  motivo: string
  monto: number
  producto?: {
    tipo: string
    talla: string
    codigo: string
  }
}

interface Recogida {
  id: string
  fecha_recogida: string
  hora: string
  efectivo_recogido: number
  diferencia: number
}

export default function CierreCajaPage() {
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [cerrandoDia, setCerrandoDia] = useState(false)
  const [resumenVentas, setResumenVentas] = useState<ResumenVentas>({
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
    total: 0,
    cantidad_ventas: 0
  })
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([])
  const [recogidas, setRecogidas] = useState<Recogida[]>([])
  const [saldoInicial, setSaldoInicial] = useState(0)
  const [saldoFinal, setSaldoFinal] = useState(0)

  useEffect(() => {
    cargarDatosDia()
  }, [fecha])

  async function cargarDatosDia() {
    setLoading(true)
    try {
      // Cargar ventas del día
      const { data: ventas, error: ventasError } = await supabase
        .from('ventas')
        .select('total, metodo_pago')
        .eq('fecha', fecha)
        .eq('verificada', true)

      if (ventasError) throw ventasError

      // Calcular resumen de ventas
      const resumen = {
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0,
        total: 0,
        cantidad_ventas: ventas?.length || 0
      }

      ventas?.forEach(v => {
        if (v.metodo_pago === 'efectivo') {
          resumen.efectivo += v.total
        } else if (v.metodo_pago === 'tarjeta') {
          resumen.tarjeta += v.total
        } else if (v.metodo_pago === 'transferencia') {
          resumen.transferencia += v.total
        }
        resumen.total += v.total
      })

      setResumenVentas(resumen)

      // Cargar devoluciones del día (si existe tabla devoluciones)
      const { data: devs } = await supabase
        .from('devoluciones')
        .select(`
          *,
          producto:productos(tipo, talla, codigo)
        `)
        .eq('fecha', fecha)
        .order('hora', { ascending: false })

      setDevoluciones(devs || [])

      // Cargar recogidas de efectivo del día
      const { data: recogs } = await supabase
        .from('recogidas_efectivo')
        .select('*')
        .eq('fecha_recogida', fecha)
        .order('hora', { ascending: false })

      setRecogidas(recogs || [])

      // Calcular saldo de caja
      const { data: caja } = await supabase
        .from('caja_efectivo')
        .select('saldo_actual')
        .eq('id', 1)
        .single()

      setSaldoFinal(caja?.saldo_actual || 0)

      // Calcular saldo inicial (saldo final - ventas efectivo del día + recogidas del día)
      const totalRecogido = recogs?.reduce((sum, r) => sum + r.efectivo_recogido, 0) || 0
      setSaldoInicial(caja?.saldo_actual || 0 - resumen.efectivo + totalRecogido)

    } catch (error) {
      console.error('Error cargando datos del día:', error)
      alert('Error al cargar los datos del día')
    } finally {
      setLoading(false)
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  function formatDate(dateStr: string) {
    return format(new Date(dateStr), 'dd MMM yyyy', { locale: es })
  }

  const totalDevoluciones = devoluciones.reduce((sum, d) => sum + d.monto, 0)
  const totalRecogido = recogidas.reduce((sum, r) => sum + r.efectivo_recogido, 0)

  async function handleCerrarDia() {
    if (!confirm('¿Estás seguro de cerrar el día de hoy?\n\nEsto permitirá registrar ventas para el día siguiente.')) {
      return
    }

    try {
      setCerrandoDia(true)

      // Por ahora solo mostrar confirmación
      // En el futuro se puede agregar lógica adicional si es necesario
      alert(`✅ Día cerrado exitosamente\n\nFecha: ${formatDate(fecha)}\n\nYa puedes registrar ventas para el día siguiente.`)

      // Recargar datos
      await cargarDatosDia()
    } catch (error) {
      console.error('Error cerrando día:', error)
      alert('Error al cerrar el día')
    } finally {
      setCerrandoDia(false)
    }
  }

  const esHoy = fecha === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cierre de Caja Diario</h1>
          <p className="text-gray-600 mt-1">Resumen completo de operaciones del día</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#55ce63]"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Cargando datos...</div>
        </div>
      ) : (
        <>
          {/* Resumen de Ventas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Efectivo */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
              <p className="text-green-100 text-sm font-medium">Ventas en Efectivo</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(resumenVentas.efectivo)}</p>
            </div>

            {/* Tarjeta */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
              <p className="text-blue-100 text-sm font-medium">Ventas con Tarjeta</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(resumenVentas.tarjeta)}</p>
            </div>

            {/* Transferencia */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
              <p className="text-purple-100 text-sm font-medium">Transferencias</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(resumenVentas.transferencia)}</p>
            </div>

            {/* Total */}
            <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg p-6 text-white shadow-lg">
              <p className="text-gray-200 text-sm font-medium">Total Ventas</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(resumenVentas.total)}</p>
              <p className="text-gray-300 text-xs mt-1">{resumenVentas.cantidad_ventas} ventas</p>
            </div>
          </div>

          {/* Saldo de Caja */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Saldo de Caja (Efectivo)</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="border-r pr-4">
                <p className="text-sm text-gray-600">Saldo Inicial</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(saldoInicial)}</p>
              </div>
              <div className="border-r pr-4">
                <p className="text-sm text-gray-600">Efectivo Recogido Hoy</p>
                <p className="text-2xl font-bold text-red-600 mt-1">-{formatCurrency(totalRecogido)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Saldo Final</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(saldoFinal)}</p>
              </div>
            </div>
          </div>

          {/* Recogidas de Efectivo */}
          {recogidas.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Recogidas de Efectivo del Día</h2>
                <p className="text-sm text-gray-600 mt-1">{recogidas.length} recogidas - Total: {formatCurrency(totalRecogido)}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto Recogido</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recogidas.map((recogida) => (
                      <tr key={recogida.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{recogida.hora}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(recogida.efectivo_recogido)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className={`font-semibold ${
                            recogida.diferencia === 0
                              ? 'text-gray-600'
                              : recogida.diferencia > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {recogida.diferencia > 0 ? '+' : ''}{formatCurrency(recogida.diferencia)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Devoluciones */}
          {devoluciones.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Devoluciones del Día</h2>
                <p className="text-sm text-gray-600 mt-1">{devoluciones.length} devoluciones - Total: {formatCurrency(totalDevoluciones)}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {devoluciones.map((devolucion) => (
                      <tr key={devolucion.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{devolucion.hora}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {devolucion.producto ? `${devolucion.producto.tipo} ${devolucion.producto.talla}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{devolucion.motivo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right font-medium">
                          {formatCurrency(devolucion.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Estado del día */}
          {resumenVentas.cantidad_ventas === 0 && recogidas.length === 0 && devoluciones.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <p className="text-yellow-800 font-medium">No hay operaciones registradas para este día</p>
              <p className="text-yellow-600 text-sm mt-1">Selecciona otra fecha para ver el reporte</p>
            </div>
          )}

          {/* Botones de acción */}
          {resumenVentas.cantidad_ventas > 0 && (
            <div className="flex justify-end gap-3">
              {esHoy && (
                <button
                  onClick={handleCerrarDia}
                  disabled={cerrandoDia}
                  className="px-6 py-2 bg-[#55ce63] hover:bg-[#45be53] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cerrandoDia ? 'Cerrando...' : '🔒 Cerrar Día de Hoy'}
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                🖨️ Imprimir Reporte
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
