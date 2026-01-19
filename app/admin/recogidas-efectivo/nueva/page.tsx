'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

type TabType = 'efectivo' | 'tarjeta' | 'transferencia'

export default function NuevaRecogidaPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('efectivo')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string>('')

  // Acumulaciones calculadas desde ventas
  const [efectivoAcumulado, setEfectivoAcumulado] = useState<number>(0)
  const [tarjetaAcumulada, setTarjetaAcumulada] = useState<number>(0)
  const [transferenciaAcumulada, setTransferenciaAcumulada] = useState<number>(0)
  const [loadingAcumulaciones, setLoadingAcumulaciones] = useState(true)

  // Fechas "desde" calculadas automáticamente
  const [fechaDesdeEfectivo, setFechaDesdeEfectivo] = useState<string>('')
  const [fechaDesdeTarjeta, setFechaDesdeTarjeta] = useState<string>('')
  const [fechaDesdeTransferencia, setFechaDesdeTransferencia] = useState<string>('')

  // Form data para efectivo
  const [formDataEfectivo, setFormDataEfectivo] = useState({
    efectivo_recogido: '',
    observaciones: ''
  })

  // Form data para tarjeta
  const [formDataTarjeta, setFormDataTarjeta] = useState({
    observaciones: ''
  })

  // Form data para transferencia
  const [formDataTransferencia, setFormDataTransferencia] = useState({
    observaciones: ''
  })

  const [fotoEfectivo, setFotoEfectivo] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  useEffect(() => {
    fetchUser()
    fetchAcumulaciones()
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
      // Obtener última recogida de efectivo
      const { data: ultimaRecogidaEfectivo } = await supabase
        .from('recogidas_efectivo')
        .select('periodo_hasta')
        .order('fecha_recogida', { ascending: false })
        .limit(1)
        .single()

      const fechaDesdeEfec = ultimaRecogidaEfectivo
        ? format(new Date(new Date(ultimaRecogidaEfectivo.periodo_hasta).getTime() + 86400000), 'yyyy-MM-dd')
        : '2000-01-01'
      setFechaDesdeEfectivo(fechaDesdeEfec)

      // Obtener última verificación de tarjeta
      const { data: ultimaVerificacionTarjeta } = await supabase
        .from('verificaciones_tarjeta')
        .select('periodo_hasta')
        .order('fecha_verificacion', { ascending: false })
        .limit(1)
        .single()

      const fechaDesdeTarj = ultimaVerificacionTarjeta
        ? format(new Date(new Date(ultimaVerificacionTarjeta.periodo_hasta).getTime() + 86400000), 'yyyy-MM-dd')
        : '2000-01-01'
      setFechaDesdeTarjeta(fechaDesdeTarj)

      // Obtener última verificación de transferencia
      const { data: ultimaVerificacionTransferencia } = await supabase
        .from('verificaciones_transferencia')
        .select('periodo_hasta')
        .order('fecha_verificacion', { ascending: false })
        .limit(1)
        .single()

      const fechaDesdeTrans = ultimaVerificacionTransferencia
        ? format(new Date(new Date(ultimaVerificacionTransferencia.periodo_hasta).getTime() + 86400000), 'yyyy-MM-dd')
        : '2000-01-01'
      setFechaDesdeTransferencia(fechaDesdeTrans)

      // Calcular acumulación de efectivo
      const { data: ventasEfectivo } = await supabase
        .from('ventas')
        .select('total')
        .eq('metodo_pago', 'efectivo')
        .gte('fecha', fechaDesdeEfec)
        .lte('fecha', format(new Date(), 'yyyy-MM-dd'))

      const efectivo = ventasEfectivo?.reduce((sum, v) => sum + v.total, 0) || 0
      setEfectivoAcumulado(efectivo)

      // Calcular acumulación de tarjeta
      const { data: ventasTarjeta } = await supabase
        .from('ventas')
        .select('total')
        .eq('metodo_pago', 'tarjeta')
        .gte('fecha', fechaDesdeTarj)
        .lte('fecha', format(new Date(), 'yyyy-MM-dd'))

      const tarjeta = ventasTarjeta?.reduce((sum, v) => sum + v.total, 0) || 0
      setTarjetaAcumulada(tarjeta)

      // Calcular acumulación de transferencia
      const { data: ventasTransferencia } = await supabase
        .from('ventas')
        .select('total')
        .eq('metodo_pago', 'transferencia')
        .gte('fecha', fechaDesdeTrans)
        .lte('fecha', format(new Date(), 'yyyy-MM-dd'))

      const transferencia = ventasTransferencia?.reduce((sum, v) => sum + v.total, 0) || 0
      setTransferenciaAcumulada(transferencia)

    } catch (error) {
      console.error('Error calculando acumulaciones:', error)
      alert('Error al calcular acumulaciones de ventas')
    } finally {
      setLoadingAcumulaciones(false)
    }
  }

  function handleRecogerTodo() {
    setFormDataEfectivo(prev => ({
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

  async function handleSubmitEfectivo(e: React.FormEvent) {
    e.preventDefault()

    if (!fotoEfectivo) {
      alert('Por favor sube una foto del efectivo recogido')
      return
    }

    const efectivoRecogido = parseFloat(formDataEfectivo.efectivo_recogido)
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
      const now = new Date()
      const fecha = format(now, 'yyyy-MM-dd')
      const hora = format(now, 'HH:mm')

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
          fecha_recogida: fecha,
          hora: hora,
          periodo_desde: fechaDesdeEfectivo,
          periodo_hasta: fecha,
          efectivo_sistema: efectivoAcumulado,
          efectivo_recogido: efectivoRecogido,
          foto_efectivo_url: publicUrl,
          observaciones: formDataEfectivo.observaciones || null,
          recogido_por: userId
        })
        .select()
        .single()

      if (insertError) throw insertError

      // 3. Actualizar caja_efectivo - RESTAR el efectivo recogido
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
          fecha_ultima_recogida: fecha,
          ultima_actualizacion: new Date().toISOString()
        })
        .eq('id', 1)

      if (updateCajaError) throw updateCajaError

      // 4. Registrar movimiento de efectivo
      const { error: movimientoError } = await supabase
        .from('movimientos_efectivo')
        .insert({
          fecha: fecha,
          hora: hora,
          tipo: 'recogida',
          monto: -efectivoRecogido,
          saldo_anterior: cajaActual?.saldo_actual || 0,
          saldo_nuevo: nuevoSaldo,
          referencia_id: recogidaData.id,
          responsable_id: userId,
          observaciones: `Recogida de efectivo. Período: ${fechaDesdeEfectivo} a ${fecha}`
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

  async function handleSubmitTarjeta(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const now = new Date()
      const fecha = format(now, 'yyyy-MM-dd')
      const hora = format(now, 'HH:mm')

      // Insertar verificación de tarjeta
      const { error: insertError } = await supabase
        .from('verificaciones_tarjeta')
        .insert({
          fecha_verificacion: fecha,
          hora: hora,
          periodo_desde: fechaDesdeTarjeta,
          periodo_hasta: fecha,
          monto_acumulado: tarjetaAcumulada,
          observaciones: formDataTarjeta.observaciones || null,
          verificado_por: userId
        })

      if (insertError) throw insertError

      alert('¡Verificación de tarjeta registrada exitosamente!')
      router.push('/admin/recogidas-efectivo')
    } catch (error: any) {
      console.error('Error al registrar verificación:', error)
      alert('Error al registrar verificación de tarjeta: ' + (error.message || 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitTransferencia(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const now = new Date()
      const fecha = format(now, 'yyyy-MM-dd')
      const hora = format(now, 'HH:mm')

      // Insertar verificación de transferencia
      const { error: insertError } = await supabase
        .from('verificaciones_transferencia')
        .insert({
          fecha_verificacion: fecha,
          hora: hora,
          periodo_desde: fechaDesdeTransferencia,
          periodo_hasta: fecha,
          monto_acumulado: transferenciaAcumulada,
          observaciones: formDataTransferencia.observaciones || null,
          verificado_por: userId
        })

      if (insertError) throw insertError

      alert('¡Verificación de transferencia registrada exitosamente!')
      router.push('/admin/recogidas-efectivo')
    } catch (error: any) {
      console.error('Error al registrar verificación:', error)
      alert('Error al registrar verificación de transferencia: ' + (error.message || 'Error desconocido'))
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
    if (!dateStr || dateStr === '2000-01-01') return 'Inicio'
    return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const diferenciaEfectivo = formDataEfectivo.efectivo_recogido
    ? parseFloat(formDataEfectivo.efectivo_recogido) - efectivoAcumulado
    : 0

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recogidas y Verificaciones</h1>
        <p className="text-gray-600 mt-1">Registra recogidas de efectivo y verifica métodos de pago digitales</p>
      </div>

      {/* Tabs - Tarjetas clicables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Efectivo */}
        <button
          onClick={() => setActiveTab('efectivo')}
          className={`text-left bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg transition-all ${
            activeTab === 'efectivo' ? 'ring-4 ring-green-300 scale-105' : 'hover:scale-102 opacity-90'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-100">💵 Efectivo</h3>
            <svg className="w-8 h-8 text-green-200 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          {loadingAcumulaciones ? (
            <p className="text-2xl font-bold">Calculando...</p>
          ) : (
            <p className="text-3xl font-bold">{formatCurrency(efectivoAcumulado)}</p>
          )}
          <p className="text-xs text-green-100 mt-2">
            Desde: {formatDate(fechaDesdeEfectivo)}
          </p>
          <p className="text-xs text-green-100">Recogida física</p>
        </button>

        {/* Tarjeta */}
        <button
          onClick={() => setActiveTab('tarjeta')}
          className={`text-left bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg transition-all ${
            activeTab === 'tarjeta' ? 'ring-4 ring-blue-300 scale-105' : 'hover:scale-102 opacity-90'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-100">💳 Tarjeta</h3>
            <svg className="w-8 h-8 text-blue-200 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          {loadingAcumulaciones ? (
            <p className="text-2xl font-bold">Calculando...</p>
          ) : (
            <p className="text-3xl font-bold">{formatCurrency(tarjetaAcumulada)}</p>
          )}
          <p className="text-xs text-blue-100 mt-2">
            Desde: {formatDate(fechaDesdeTarjeta)}
          </p>
          <p className="text-xs text-blue-100">Solo verificación</p>
        </button>

        {/* Transferencia */}
        <button
          onClick={() => setActiveTab('transferencia')}
          className={`text-left bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg transition-all ${
            activeTab === 'transferencia' ? 'ring-4 ring-purple-300 scale-105' : 'hover:scale-102 opacity-90'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-purple-100">🏦 Transferencias</h3>
            <svg className="w-8 h-8 text-purple-200 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          {loadingAcumulaciones ? (
            <p className="text-2xl font-bold">Calculando...</p>
          ) : (
            <p className="text-3xl font-bold">{formatCurrency(transferenciaAcumulada)}</p>
          )}
          <p className="text-xs text-purple-100 mt-2">
            Desde: {formatDate(fechaDesdeTransferencia)}
          </p>
          <p className="text-xs text-purple-100">Solo verificación</p>
        </button>
      </div>

      {/* Formulario según el tab activo */}
      {activeTab === 'efectivo' && (
        <form onSubmit={handleSubmitEfectivo} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-xl font-bold text-gray-900">Recogida de Efectivo</h2>
            <p className="text-sm text-gray-600">Se recoge físicamente el efectivo acumulado</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-900">Período de acumulación</p>
            <p className="text-lg font-bold text-green-700 mt-1">
              {formatDate(fechaDesdeEfectivo)} → Hoy
            </p>
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
                value={formDataEfectivo.efectivo_recogido}
                onChange={(e) => setFormDataEfectivo({ ...formDataEfectivo, efectivo_recogido: e.target.value })}
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

          {/* Diferencia */}
          {formDataEfectivo.efectivo_recogido && (
            <div className={`p-4 rounded-lg ${
              diferenciaEfectivo === 0
                ? 'bg-gray-50 border border-gray-200'
                : diferenciaEfectivo > 0
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className="text-sm font-medium text-gray-700 mb-1">Diferencia</p>
              <p className={`text-2xl font-bold ${
                diferenciaEfectivo === 0
                  ? 'text-gray-600'
                  : diferenciaEfectivo > 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {diferenciaEfectivo > 0 ? '+' : ''}{formatCurrency(diferenciaEfectivo)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {diferenciaEfectivo > 0 && 'Sobrante - Hay más efectivo del esperado'}
                {diferenciaEfectivo < 0 && 'Faltante - Hay menos efectivo del esperado'}
                {diferenciaEfectivo === 0 && 'Sin diferencia - Cuadra perfecto'}
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
                <img src={previewUrl} alt="Preview" className="max-w-full h-auto rounded-lg border max-h-64 object-contain" />
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones (opcional)
            </label>
            <textarea
              value={formDataEfectivo.observaciones}
              onChange={(e) => setFormDataEfectivo({ ...formDataEfectivo, observaciones: e.target.value })}
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
      )}

      {activeTab === 'tarjeta' && (
        <form onSubmit={handleSubmitTarjeta} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-xl font-bold text-gray-900">Verificación de Tarjeta</h2>
            <p className="text-sm text-gray-600">Solo verificación - No se recoge físicamente</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900">Período de acumulación</p>
            <p className="text-lg font-bold text-blue-700 mt-1">
              {formatDate(fechaDesdeTarjeta)} → Hoy
            </p>
            <p className="text-2xl font-bold text-blue-900 mt-3">
              {formatCurrency(tarjetaAcumulada)}
            </p>
            <p className="text-xs text-blue-700 mt-1">Este monto solo se verifica contra los comprobantes bancarios</p>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones (opcional)
            </label>
            <textarea
              value={formDataTarjeta.observaciones}
              onChange={(e) => setFormDataTarjeta({ ...formDataTarjeta, observaciones: e.target.value })}
              rows={3}
              placeholder="Notas sobre la verificación de pagos con tarjeta..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900">Información</p>
                <p className="text-sm text-blue-700 mt-1">
                  Los pagos con tarjeta se verifican contra el estado de cuenta del datáfono. Revisa los comprobantes en la sección de ventas.
                </p>
              </div>
            </div>
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
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registrando...' : 'Registrar Verificación'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'transferencia' && (
        <form onSubmit={handleSubmitTransferencia} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-xl font-bold text-gray-900">Verificación de Transferencias</h2>
            <p className="text-sm text-gray-600">Solo verificación - No se recoge físicamente</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm font-medium text-purple-900">Período de acumulación</p>
            <p className="text-lg font-bold text-purple-700 mt-1">
              {formatDate(fechaDesdeTransferencia)} → Hoy
            </p>
            <p className="text-2xl font-bold text-purple-900 mt-3">
              {formatCurrency(transferenciaAcumulada)}
            </p>
            <p className="text-xs text-purple-700 mt-1">Este monto solo se verifica contra las transferencias bancarias</p>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones (opcional)
            </label>
            <textarea
              value={formDataTransferencia.observaciones}
              onChange={(e) => setFormDataTransferencia({ ...formDataTransferencia, observaciones: e.target.value })}
              rows={3}
              placeholder="Notas sobre la verificación de transferencias..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-purple-900">Información</p>
                <p className="text-sm text-purple-700 mt-1">
                  Las transferencias se verifican contra el estado de cuenta bancario. Revisa los comprobantes de transferencia en la sección de ventas.
                </p>
              </div>
            </div>
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
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registrando...' : 'Registrar Verificación'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
