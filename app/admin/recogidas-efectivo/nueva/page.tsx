'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

export default function NuevaRecogidaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [efectivoSistema, setEfectivoSistema] = useState<number>(0)
  const [loadingEfectivo, setLoadingEfectivo] = useState(true)

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
    fetchEfectivoSistema()
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

  async function fetchEfectivoSistema() {
    try {
      // Obtener saldo actual de caja
      const { data: cajaData, error: cajaError } = await supabase
        .from('caja_efectivo')
        .select('saldo_actual')
        .eq('id', 1)
        .single()

      if (cajaError) throw cajaError

      setEfectivoSistema(cajaData?.saldo_actual || 0)
    } catch (error) {
      console.error('Error fetching efectivo sistema:', error)
      alert('Error al obtener el efectivo en sistema')
    } finally {
      setLoadingEfectivo(false)
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
        // Establecer periodo_desde como el día siguiente a la última recogida
        const ultimaFecha = new Date(data.periodo_hasta)
        ultimaFecha.setDate(ultimaFecha.getDate() + 1)
        setFormData(prev => ({
          ...prev,
          periodo_desde: format(ultimaFecha, 'yyyy-MM-dd')
        }))
      }
    } catch (error) {
      // Si no hay recogidas previas, no hacer nada
      console.log('No hay recogidas previas')
    }
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
          efectivo_sistema: efectivoSistema,
          efectivo_recogido: efectivoRecogido,
          foto_efectivo_url: publicUrl,
          observaciones: formData.observaciones || null,
          recogido_por: userId
        })
        .select()
        .single()

      if (insertError) throw insertError

      // 3. Actualizar caja_efectivo - RESTAR el efectivo recogido
      const nuevoSaldo = efectivoSistema - efectivoRecogido

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
          monto: -efectivoRecogido, // Negativo porque sale de caja
          saldo_anterior: efectivoSistema,
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
    ? parseFloat(formData.efectivo_recogido) - efectivoSistema
    : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Recogida de Efectivo</h1>
        <p className="text-gray-600 mt-1">Registra la recogida de efectivo de caja</p>
      </div>

      {/* Efectivo en Sistema */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-blue-700 font-medium">Efectivo en Sistema (Caja Actual)</p>
            {loadingEfectivo ? (
              <p className="text-blue-900 text-lg font-bold">Calculando...</p>
            ) : (
              <p className="text-blue-900 text-2xl font-bold">{formatCurrency(efectivoSistema)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
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
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.efectivo_recogido}
            onChange={(e) => setFormData({ ...formData, efectivo_recogido: e.target.value })}
            placeholder="Ingresa el efectivo contado físicamente"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55ce63] focus:border-transparent"
          />
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
            disabled={loading || loadingEfectivo}
            className="flex-1 bg-[#55ce63] hover:bg-[#45be53] text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrando...' : 'Registrar Recogida'}
          </button>
        </div>
      </form>
    </div>
  )
}
