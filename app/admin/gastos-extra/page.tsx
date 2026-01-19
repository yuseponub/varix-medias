'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getFechaActual, getHoraActual, formatFechaLocal } from '@/lib/utils/dates'

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
  aprobado_por: string | null
  fecha_aprobacion: string | null
  usuarios: {
    nombre: string
  }
  aprobador?: {
    nombre: string
  }
}

export default function GastosExtraPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'aprobados'>('todos')

  // Formulario
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [categoria, setCategoria] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  useEffect(() => {
    cargarGastos()
  }, [filtro])

  const cargarGastos = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('gastos_extra')
        .select(`
          *,
          usuarios:registrado_por(nombre),
          aprobador:aprobado_por(nombre)
        `)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (filtro === 'pendientes') {
        query = query.eq('estado', 'pendiente')
      } else if (filtro === 'aprobados') {
        query = query.eq('estado', 'aprobado')
      }

      const { data, error } = await query

      if (error) throw error
      setGastos(data || [])
    } catch (error) {
      console.error('Error cargando gastos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0])
    }
  }

  const registrarGasto = async () => {
    // Validación mínima: solo concepto y monto son obligatorios
    if (!concepto.trim()) {
      alert('Ingresa el concepto del gasto')
      return
    }

    if (!monto || parseFloat(monto) <= 0) {
      alert('Ingresa un monto válido')
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      let documentoUrl = null
      let documentoNombre = null

      // Subir archivo si existe
      if (archivo) {
        const timestamp = Date.now()
        const nombreArchivo = `${timestamp}_${archivo.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('gastos-extra-documentos')
          .upload(nombreArchivo, archivo)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('gastos-extra-documentos')
          .getPublicUrl(nombreArchivo)

        documentoUrl = urlData.publicUrl
        documentoNombre = archivo.name
      }

      const fecha = getFechaActual()
      const hora = getHoraActual()

      const { error } = await supabase
        .from('gastos_extra')
        .insert({
          fecha,
          hora,
          concepto,
          monto: parseFloat(monto),
          categoria: categoria || null,
          observaciones: observaciones || null,
          documento_url: documentoUrl,
          documento_nombre: documentoNombre,
          registrado_por: user.id,
          estado: 'pendiente'
        })

      if (error) throw error

      alert('Gasto registrado. Pendiente de aprobación.')

      // Limpiar formulario
      setConcepto('')
      setMonto('')
      setCategoria('')
      setObservaciones('')
      setArchivo(null)
      setMostrarFormulario(false)

      await cargarGastos()
    } catch (error) {
      console.error('Error registrando gasto:', error)
      alert('Error al registrar el gasto')
    } finally {
      setSubmitting(false)
    }
  }

  const aprobarGasto = async (gasto: Gasto) => {
    const confirmar = confirm(
      `¿Aprobar gasto de $${gasto.monto.toLocaleString('es-CO')} por "${gasto.concepto}"?\n\nEsto descontará del efectivo en caja.`
    )

    if (!confirmar) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      // Actualizar estado del gasto
      const { error: gastoError } = await supabase
        .from('gastos_extra')
        .update({
          estado: 'aprobado',
          aprobado_por: user.id,
          fecha_aprobacion: new Date().toISOString()
        })
        .eq('id', gasto.id)

      if (gastoError) throw gastoError

      // Descontar del efectivo en caja
      const { data: caja, error: cajaError } = await supabase
        .from('caja_efectivo')
        .select('saldo_actual')
        .eq('id', 1)
        .single()

      if (cajaError) throw cajaError

      const nuevoSaldo = (caja?.saldo_actual || 0) - gasto.monto

      const { error: updateCajaError } = await supabase
        .from('caja_efectivo')
        .update({ saldo_actual: nuevoSaldo })
        .eq('id', 1)

      if (updateCajaError) throw updateCajaError

      // Registrar movimiento de efectivo
      const { error: movError } = await supabase
        .from('movimientos_efectivo')
        .insert({
          tipo: 'gasto',
          monto: gasto.monto,
          concepto: `Gasto extra: ${gasto.concepto}`,
          fecha: getFechaActual(),
          hora: getHoraActual()
        })

      if (movError) throw movError

      alert('Gasto aprobado y efectivo actualizado')
      await cargarGastos()
    } catch (error) {
      console.error('Error aprobando gasto:', error)
      alert('Error al aprobar el gasto')
    } finally {
      setLoading(false)
    }
  }

  const calcularTotalPendiente = () => {
    return gastos
      .filter(g => g.estado === 'pendiente')
      .reduce((sum, g) => sum + g.monto, 0)
  }

  const calcularTotalAprobado = () => {
    return gastos
      .filter(g => g.estado === 'aprobado')
      .reduce((sum, g) => sum + g.monto, 0)
  }

  if (loading && gastos.length === 0) {
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
          Gastos Extra
        </h1>
        <p className="text-gray-600">
          Pequeños gastos como facturas, cajas, comisiones, etc. Requieren aprobación para descontar del efectivo.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <p className="text-sm text-gray-500 mb-1">Total Pendiente</p>
          <p className="text-3xl font-bold" style={{ color: '#d4a700' }}>
            ${calcularTotalPendiente().toLocaleString('es-CO')}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <p className="text-sm text-gray-500 mb-1">Total Aprobado</p>
          <p className="text-3xl font-bold" style={{ color: '#4ade80' }}>
            ${calcularTotalAprobado().toLocaleString('es-CO')}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <p className="text-sm text-gray-500 mb-1">Cantidad de Gastos</p>
          <p className="text-3xl font-bold" style={{ color: '#0e0142' }}>
            {gastos.length}
          </p>
        </div>
      </div>

      {/* Botón Registrar Gasto */}
      <div className="mb-6">
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="px-6 py-3 rounded-lg font-bold transition hover:opacity-90"
          style={{ backgroundColor: '#ffe248', color: '#0e0142' }}
        >
          {mostrarFormulario ? '✕ Cancelar' : '+ Registrar Nuevo Gasto'}
        </button>
      </div>

      {/* Formulario de Registro */}
      {mostrarFormulario && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4" style={{ color: '#0e0142' }}>
            Nuevo Gasto Extra
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
                Concepto *
              </label>
              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
                placeholder="Ej: Factura de luz, Cajas, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
                Monto *
              </label>
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
                Categoría (opcional)
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
              >
                <option value="">Seleccionar...</option>
                <option value="facturas">Facturas</option>
                <option value="cajas">Cajas y embalaje</option>
                <option value="comisiones">Comisiones</option>
                <option value="transporte">Transporte</option>
                <option value="otros">Otros</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
                Documento (opcional)
              </label>
              <input
                type="file"
                onChange={handleArchivoChange}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
              Observaciones (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
              placeholder="Detalles adicionales..."
            />
          </div>

          <button
            onClick={registrarGasto}
            disabled={submitting}
            className="w-full px-6 py-3 rounded-lg font-bold transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#a294da', color: 'white' }}
          >
            {submitting ? 'Registrando...' : '💾 Registrar Gasto'}
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setFiltro('todos')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filtro === 'todos' ? 'text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          style={filtro === 'todos' ? { backgroundColor: '#0e0142' } : {}}
        >
          Todos ({gastos.length})
        </button>
        <button
          onClick={() => setFiltro('pendientes')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filtro === 'pendientes' ? 'text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          style={filtro === 'pendientes' ? { backgroundColor: '#d4a700' } : {}}
        >
          Pendientes
        </button>
        <button
          onClick={() => setFiltro('aprobados')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filtro === 'aprobados' ? 'text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          style={filtro === 'aprobados' ? { backgroundColor: '#4ade80' } : {}}
        >
          Aprobados
        </button>
      </div>

      {/* Lista de Gastos */}
      {gastos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">💸</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#0e0142' }}>
            No hay gastos registrados
          </h2>
        </div>
      ) : (
        <div className="space-y-4">
          {gastos.map(gasto => (
            <div key={gasto.id} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold" style={{ color: '#0e0142' }}>
                      {gasto.concepto}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        gasto.estado === 'pendiente'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {gasto.estado === 'pendiente' ? 'Pendiente' : 'Aprobado'}
                    </span>
                    {gasto.categoria && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {gasto.categoria}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Registrado por {gasto.usuarios?.nombre} el {formatFechaLocal(gasto.fecha)} a las {gasto.hora}
                  </p>
                  {gasto.estado === 'aprobado' && gasto.aprobador && (
                    <p className="text-sm text-green-600">
                      Aprobado por {gasto.aprobador.nombre}
                    </p>
                  )}
                  {gasto.observaciones && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Obs:</strong> {gasto.observaciones}
                    </p>
                  )}
                  {gasto.documento_url && (
                    <a
                      href={gasto.documento_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline inline-block mt-2"
                      style={{ color: '#a294da' }}
                    >
                      📄 Ver documento
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: '#0e0142' }}>
                    ${gasto.monto.toLocaleString('es-CO')}
                  </p>
                  {gasto.estado === 'pendiente' && (
                    <button
                      onClick={() => aprobarGasto(gasto)}
                      disabled={loading}
                      className="mt-3 px-4 py-2 rounded-lg font-medium transition hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#ffe248', color: '#0e0142' }}
                    >
                      ✅ Aprobar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
