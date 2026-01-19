'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

export default function NuevaRecogidaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string>('')

  // Acumulaciones calculadas desde ventas
  const [efectivoAcumulado, setEfectivoAcumulado] = useState<number>(0)
  const [tarjetaAcumulada, setTarjetaAcumulada] = useState<number>(0)
  const [transferenciaAcumulada, setTransferenciaAcumulada] = useState<number>(0)
  const [loadingAcumulaciones, setLoadingAcumulaciones] = useState(true)

  const [formData, setFormData] = useState({
    fecha_recogida: format(new Date(), 'yyyy-MM-dd'),
    hora: format(new Date(), 'HH:mm'),
    periodo_desde: '',
    periodo_hasta: format(new Date(), 'yyyy-MM-dd'),
    efectivo_recogido: '',
    observaciones: ''
  })

  const [fotoEfectivo, setFotoEfectivo] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  useEffect(() => {
    fetchUser()
    fetchAcumulaciones()
    fetchUltimaRecogida()
  }, [])

  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: userData } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (userData) {
      setUserId(userData.id)
    }
  }

  async function fetchAcumulaciones() {
    try {
      // Obtener la última recogida para saber desde cuándo calcular
      const { data: ultimaRecogida } = await supabase
        .from('recogidas_efectivo')
        .select('periodo_hasta')
        .order('fecha_recogida', { ascending: false })
        .limit(1)
        .single()

      const fechaDesde = ultimaRecogida
        ? new Date(new Date(ultimaRecogida.periodo_hasta).getTime() + 86400000) // +1 día
        : new Date('2000-01-01') // Si no hay recogidas, desde el principio

      // Calcular acumulaciones desde las ventas
      const { data: ventas, error } = await supabase
        .from('ventas')
        .select('metodo_pago, total')
        .gte('fecha', format(fechaDesde, 'yyyy-MM-dd'))
        .lte('fecha', format(new Date(), 'yyyy-MM-dd'))

      if (error) throw error

      let efectivo = 0
      let tarjeta = 0
      let transferencia = 0

      ventas?.forEach(venta => {
        if (venta.metodo_pago === 'efectivo') {
          efectivo += venta.total
        } else if (venta.metodo_pago === 'tarjeta') {
          tarjeta += venta.total
        } else if (venta.metodo_pago === 'transferencia') {
          transferencia += venta.total
        }
      })

      setEfectivoAcumulado(efectivo)
      setTarjetaAcumulada(tarjeta)
      setTransferenciaAcumulada(transferencia)
    } catch (error) {
      console.error('Error calculando acumulaciones:', error)
      alert('Error al calcular acumulaciones de ventas')
    } finally {
      setLoadingAcumulaciones(false)
    }
  }

  async function fetchUltimaRecogida() {
    try {
      const { data, error } = await supabase
        .from('recogidas_efectivo')
        .select('fecha_recogida, periodo_hasta')
        .order('fecha_recogida', { ascending: false })
        .order('hora', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        const ultimaFecha = new Date(data.periodo_hasta)
        ultimaFecha.setDate(ultimaFecha.getDate() + 1)
        setFormData(prev => ({
          ...prev,
          periodo_desde: format(ultimaFecha, 'yyyy-MM-dd')
        }))
      }
    } catch (error) {
      console.log('No hay recogidas previas')
    }
  }

  function handleRecogerTodo() {
    setFormData(prev => ({
      ...prev,
      efectivo_recogido: efectivoAcumulado.toString()
    }))
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setFotoEfectivo(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!fotoEfectivo) {
      alert('Por favor sube una foto del efectivo recogido')
      return
    }

    if (!formData.periodo_desde) {
      alert('Por favor ingresa la fecha desde del período')
      return
    }

    const efectivoRecogido = parseFloat(formData.efectivo_recogido)
    if (isNaN(efectivoRecogido) || efectivoRecogido < 0) {
      alert('Por favor ingresa un monto válido para el efectivo recogido')
      return
    }

    if (efectivoRecogido > efectivoAcumulado) {
      const confirmar = confirm(
        `⚠️ ADVERTENCIA: Estás recogiendo más efectivo del acumulado\n\n` +
        `Efectivo acumulado: ${formatCurrency(efectivoAcumulado)}\n` +
        `Efectivo a recoger: ${formatCurrency(efectivoRecogido)}\n\n` +
        `¿Deseas continuar de todos modos?`
      )
      if (!confirmar) return
    }

    setLoading(true)

    try {
      // 1. Subir foto del efectivo
      const fotoPath = `recogidas-efectivo/${Date.now()}_${fotoEfectivo.name}`
      const { error: uploadError } = await supabase.storage
        .from('facturas')
        .upload(fotoPath, fotoEfectivo)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('facturas')
        .getPublicUrl(fotoPath)

      // 2. Insertar recogida de efectivo
      const { data: recogidaData, error: insertError } = await supabase
        .from('recogidas_efectivo')
        .insert({
          fecha_recogida: formData.fecha_recogida,
          hora: formData.hora,
          periodo_desde: formData.periodo_desde,
          periodo_hasta: formData.periodo_hasta,
          efectivo_sistema: efectivoAcumulado,
          efectivo_recogido: efectivoRecogido,
          foto_efectivo_url: publicUrl,
          observaciones: formData.observaciones || null,
          recogido_por: userId
        })
        .select()
        .single()

      if (insertError) throw insertError

      // 3. Actualizar caja_efectivo - RESTAR el efectivo recogido del acumulado
      const { data: cajaActual } = await supabase
        .from('caja_efectivo')
        .select('saldo_actual')
        .eq('id', 1)
        .single()

      const nuevoSaldo = (cajaActual?.saldo_actual || 0) - efectivoRecogido

      const { error: updateCajaError } = await supabase
        .from('caja_efectivo')
        .update({
          saldo_actual: nuevoSaldo,
          ultima_recogida_id: recogidaData.id,
          fecha_ultima_recogida: formData.fecha_recogida,
          ultima_actualizacion: new Date().toISOString()
        })
        .eq('id', 1)

      if (updateCajaError) throw updateCajaError

      // 4. Registrar movimiento de efectivo
      const { error: movimientoError } = await supabase
        .from('movimientos_efectivo')
        .insert({
          fecha: formData.fecha_recogida,
          hora: formData.hora,
          tipo: 'recogida',
          monto: -efectivoRecogido,
          saldo_anterior: cajaActual?.saldo_actual || 0,
          saldo_nuevo: nuevoSaldo,
          referencia_id: recogidaData.id,
          responsable_id: userId,
          observaciones: `Recogida de efectivo. Período: ${formData.periodo_desde} a ${formData.periodo_hasta}`
        })

      if (movimientoError) throw movimientoError

      alert('¡Recogida de efectivo registrada exitosamente!')
      router.push('/admin/recogidas-efectivo')
    } catch (error: any) {
      console.error('Error al registrar recogida:', error)
      alert('Error al registrar recogida de efectivo: ' + (error.message || 'Error desconocido'))
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

  const diferencia = formData.efectivo_recogido
    ? parseFloat(formData.efectivo_recogido) - efectivoAcumulado
    : 0

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Recogida de Efectivo</h1>
        <p className="text-gray-600 mt-1">Registra la recogida de efectivo y verifica los métodos de pago digitales</p>
      </div>

      {/* Acumulaciones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Efectivo */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-100">💵 Efectivo Acumulado</h3>
            <svg className="w-8 h-8 text-green-200 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          {loadingAcumulaciones ? (
            <p className="text-2xl font-bold">Calculando...</p>
          ) : (
            <p className="text-3xl font-bold">{formatCurrency(efectivoAcumulado)}</p>
          )}
          <p className="text-xs text-green-100 mt-2">Disponible para recoger</p>
        </div>

        {/* Tarjeta */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-100">💳 Tarjeta Acumulada</h3>
            <svg className="w-8 h-8 text-blue-200 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          {loadingAcumulaciones ? (
            <p className="text-2xl font-bold">Calculando...</p>
          ) : (
            <p className="text-3xl font-bold">{formatCurrency(tarjetaAcumulada)}</p>
          )}
          <p className="text-xs text-blue-100 mt-2">Solo verificación</p>
        </div>

        {/* Transferencia */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-purple-100">🏦 Transferencias Acumuladas</h3>
            <svg className="w-8 h-8 text-purple-200 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          {loadingAcumulaciones ? (
            <p className="text-2xl font-bold">Calculando...</p>
          ) : (
            <p className="text-3xl font-bold">{formatCurrency(transferenciaAcumulada)}</p>
          )}
          <p className="text-xs text-purple-100 mt-2">Solo verificación</p>
        </div>
      </div>

      {/* Formulario de Recogida de Efectivo */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-xl font-bold text-gray-900">Recogida de Efectivo</h2>
          <p className="text-sm text-gray-600">Solo se recoge físicamente el efectivo</p>
        </div>

        {/* Fecha y Hora */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Recogida *
            </label>
            <input
              type="date"
              required
              value={formData.fecha_recogida}
              onChange={(e) => setFormData({ ...formData, fecha_recogida: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55ce63] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora *
            </label>
            <input
              type="time"
              required
              value={formData.hora}
              onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55ce63] focus:border-transparent"
            />
          </div>
        </div>

        {/* Período */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Período Desde *
            </label>
            <input
              type="date"
              required
              value={formData.periodo_desde}
              onChange={(e) => setFormData({ ...formData, periodo_desde: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55ce63] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Período Hasta *
            </label>
            <input
              type="date"
              required
              value={formData.periodo_hasta}
              onChange={(e) => setFormData({ ...formData, periodo_hasta: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55ce63] focus:border-transparent"
            />
          </div>
        </div>

        {/* Efectivo Recogido */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Efectivo Recogido (Real) *
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.efectivo_recogido}
              onChange={(e) => setFormData({ ...formData, efectivo_recogido: e.target.value })}
              placeholder="Ingresa el efectivo contado físicamente"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55ce63] focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleRecogerTodo}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
            >
              Recoger Todo
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Click en "Recoger Todo" para recoger todo el efectivo acumulado ({formatCurrency(efectivoAcumulado)})
          </p>
        </div>

        {/* Diferencia Calculada */}
        {formData.efectivo_recogido && (
          <div className={`p-4 rounded-lg ${
            diferencia === 0
              ? 'bg-gray-50 border border-gray-200'
              : diferencia > 0
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className="text-sm font-medium text-gray-700 mb-1">Diferencia</p>
            <p className={`text-2xl font-bold ${
              diferencia === 0
                ? 'text-gray-600'
                : diferencia > 0
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {diferencia > 0 ? '+' : ''}{formatCurrency(diferencia)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {diferencia > 0 && 'Sobrante - Hay más efectivo del esperado'}
              {diferencia < 0 && 'Faltante - Hay menos efectivo del esperado'}
              {diferencia === 0 && 'Sin diferencia - Cuadra perfecto'}
            </p>
          </div>
        )}

        {/* Foto del Efectivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Foto del Efectivo Recogido *
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55ce63] focus:border-transparent"
          />
          {previewUrl && (
            <div className="mt-3">
              <img src={previewUrl} alt="Preview" className="max-w-full h-auto rounded-lg border" />
            </div>
          )}
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones
          </label>
          <textarea
            value={formData.observaciones}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            rows={3}
            placeholder="Notas adicionales sobre la recogida..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55ce63] focus:border-transparent"
          />
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || loadingAcumulaciones}
            className="flex-1 bg-[#55ce63] hover:bg-[#45be53] text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrando...' : 'Registrar Recogida'}
          </button>
        </div>
      </form>

      {/* Info sobre tarjeta y transferencias */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900">Información sobre pagos digitales</p>
            <p className="text-sm text-blue-700 mt-1">
              Los montos de tarjeta y transferencias solo se verifican contra los comprobantes de pago registrados en el sistema.
              No se recogen físicamente. Puedes revisar los comprobantes en la sección de ventas.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
