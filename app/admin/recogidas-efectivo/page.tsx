'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface RecogidaEfectivo {
  id: string
  fecha_recogida: string
  hora: string
  periodo_desde: string
  periodo_hasta: string
  efectivo_sistema: number
  efectivo_recogido: number
  diferencia: number
  foto_efectivo_url: string | null
  observaciones: string | null
  recogido_por: string
  created_at: string
  usuario?: {
    nombre: string
  }
}

export default function RecogidasEfectivoPage() {
  const router = useRouter()
  const [recogidas, setRecogidas] = useState<RecogidaEfectivo[]>([])
  const [loading, setLoading] = useState(true)
  const [cajaActual, setCajaActual] = useState<number>(0)

  useEffect(() => {
    fetchRecogidas()
    fetchCajaActual()
  }, [])

  async function fetchRecogidas() {
    try {
      const { data, error } = await supabase
        .from('recogidas_efectivo')
        .select(`
          *,
          usuario:usuarios!recogidas_efectivo_recogido_por_fkey(nombre)
        `)
        .order('fecha_recogida', { ascending: false })
        .order('hora', { ascending: false })

      if (error) throw error
      setRecogidas(data || [])
    } catch (error) {
      console.error('Error fetching recogidas:', error)
      alert('Error al cargar recogidas de efectivo')
    } finally {
      setLoading(false)
    }
  }

  async function fetchCajaActual() {
    try {
      const { data, error } = await supabase
        .from('caja_efectivo')
        .select('saldo_actual')
        .eq('id', 1)
        .single()

      if (error) throw error
      setCajaActual(data?.saldo_actual || 0)
    } catch (error) {
      console.error('Error fetching caja actual:', error)
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

  function formatDate(dateString: string) {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: es })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando recogidas de efectivo...</div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <button
        onClick={() => router.push('/admin/ventas')}
        className="mb-4 px-4 py-2 rounded-lg font-medium transition hover:opacity-80 flex items-center gap-2"
        style={{ backgroundColor: '#f3f1fa', color: '#6f4ec8' }}
      >
        ← Regresar a Ventas
      </button>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recogidas de Efectivo</h1>
          <p className="text-gray-600 mt-1">Historial de recogidas de efectivo de caja</p>
        </div>
        <Link
          href="/admin/recogidas-efectivo/nueva"
          className="bg-[#55ce63] hover:bg-[#45be53] text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          + Nueva Recogida
        </Link>
      </div>

      {/* Saldo Actual de Caja */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-green-100 text-sm font-medium">Saldo Actual en Caja</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(cajaActual)}</p>
          </div>
          <svg className="w-16 h-16 text-green-200 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      </div>

      {/* Tabla de Recogidas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {recogidas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>No hay recogidas de efectivo registradas</p>
            <Link href="/admin/recogidas-efectivo/nueva" className="text-[#55ce63] hover:underline mt-2 inline-block">
              Registrar primera recogida
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sistema</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Recogido</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Diferencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recogido por</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Foto</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recogidas.map((recogida) => (
                  <tr key={recogida.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatDate(recogida.fecha_recogida)}</div>
                      <div className="text-xs text-gray-500">{recogida.hora}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(recogida.periodo_desde)}
                      </div>
                      <div className="text-xs text-gray-500">
                        hasta {formatDate(recogida.periodo_hasta)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(recogida.efectivo_sistema)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {formatCurrency(recogida.efectivo_recogido)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-semibold ${
                        recogida.diferencia === 0
                          ? 'text-gray-600'
                          : recogida.diferencia > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {recogida.diferencia > 0 ? '+' : ''}{formatCurrency(recogida.diferencia)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recogida.usuario?.nombre || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {recogida.foto_efectivo_url ? (
                        <a
                          href={recogida.foto_efectivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#55ce63] hover:text-[#45be53] text-sm font-medium"
                        >
                          Ver foto
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">Sin foto</span>
                      )}
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
