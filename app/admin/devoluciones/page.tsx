'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getFechaActual, getHoraActual } from '@/lib/utils/dates'

interface Devolucion {
  id: string
  fecha: string
  hora: string
  numero_factura_original?: string
  nombre_cliente?: string
  referencia_producto: string
  cantidad_pares: number
  monto_devuelto: number
  motivo: string
  estado: string
  registrado_por_nombre: string
}

export default function DevolucionesPage() {
  const router = useRouter()
  const fileInputNotaRef = useRef<HTMLInputElement>(null)
  const fileInputFacturaOriginalRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [processingOCR, setProcessingOCR] = useState(false)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  // Estados para la nota de devolución
  const [notaDevolucionFile, setNotaDevolucionFile] = useState<File | null>(null)
  const [notaDevolucionPreview, setNotaDevolucionPreview] = useState<string | null>(null)
  const [notaDevolucionUrl, setNotaDevolucionUrl] = useState<string | null>(null)

  // Estados para la factura original (si no está en el sistema)
  const [facturaOriginalFile, setFacturaOriginalFile] = useState<File | null>(null)
  const [facturaOriginalPreview, setFacturaOriginalPreview] = useState<string | null>(null)
  const [facturaOriginalUrl, setFacturaOriginalUrl] = useState<string | null>(null)

  const [ventaEncontrada, setVentaEncontrada] = useState<any>(null)
  const [requiereFacturaOriginal, setRequiereFacturaOriginal] = useState(false)

  const [formData, setFormData] = useState({
    numero_factura_original: '',
    referencia_producto: '',
    nombre_cliente: '',
    cedula_cliente: '',
    cantidad_pares: '',
    monto_devuelto: '',
    motivo: '',
    observaciones: ''
  })

  const [productos, setProductos] = useState<any[]>([])
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([])
  const [loadingDevoluciones, setLoadingDevoluciones] = useState(true)

  useEffect(() => {
    checkAuth()
    loadProductos()
    loadDevoluciones()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
  }

  const loadProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('codigo')

      if (error) throw error
      setProductos(data || [])
    } catch (error) {
      console.error('Error cargando productos:', error)
    }
  }

  const loadDevoluciones = async () => {
    try {
      setLoadingDevoluciones(true)
      const { data, error } = await supabase
        .from('devoluciones')
        .select(`
          *,
          usuarios:registrado_por (nombre)
        `)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (error) throw error

      const devolucionesFormateadas = data?.map(d => ({
        id: d.id,
        fecha: d.fecha,
        hora: d.hora,
        numero_factura_original: d.numero_factura_original,
        nombre_cliente: d.nombre_cliente,
        referencia_producto: d.referencia_producto,
        cantidad_pares: d.cantidad_pares,
        monto_devuelto: d.monto_devuelto,
        motivo: d.motivo,
        estado: d.estado,
        registrado_por_nombre: d.usuarios?.nombre || 'Desconocido'
      })) || []

      setDevoluciones(devolucionesFormateadas)
    } catch (error) {
      console.error('Error cargando devoluciones:', error)
    } finally {
      setLoadingDevoluciones(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'nota' | 'factura_original') => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy grande. Máximo 5MB')
      return
    }

    if (tipo === 'nota') {
      setNotaDevolucionFile(file)

      const reader = new FileReader()
      reader.onload = (e) => {
        setNotaDevolucionPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      await uploadNotaDevolucion(file)
    } else {
      setFacturaOriginalFile(file)

      const reader = new FileReader()
      reader.onload = (e) => {
        setFacturaOriginalPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      await uploadFacturaOriginal(file)
    }
  }

  const uploadNotaDevolucion = async (file: File) => {
    try {
      setUploadingImage(true)

      const fileName = `nota_devolucion_${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage
        .from('facturas')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('facturas')
        .getPublicUrl(data.path)

      setNotaDevolucionUrl(urlData.publicUrl)

      // Procesar OCR de la nota de devolución
      await processOCRNotaDevolucion(urlData.publicUrl)
    } catch (error) {
      console.error('Error subiendo nota de devolución:', error)
      alert('Error al subir la imagen. Intenta nuevamente.')
    } finally {
      setUploadingImage(false)
    }
  }

  const uploadFacturaOriginal = async (file: File) => {
    try {
      setUploadingImage(true)

      const fileName = `factura_original_devolucion_${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage
        .from('facturas')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('facturas')
        .getPublicUrl(data.path)

      setFacturaOriginalUrl(urlData.publicUrl)
    } catch (error) {
      console.error('Error subiendo factura original:', error)
      alert('Error al subir la imagen. Intenta nuevamente.')
    } finally {
      setUploadingImage(false)
    }
  }

  const processOCRNotaDevolucion = async (imageUrl: string) => {
    try {
      setProcessingOCR(true)
      console.log('🔍 Procesando OCR para nota de devolución:', imageUrl)

      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl })
      })

      if (!response.ok) {
        console.error('❌ Error en API OCR')
        throw new Error('Error en OCR')
      }

      const data = await response.json()
      console.log('✅ Resultado OCR:', data)

      // Extraer número de factura y buscar la venta en el sistema
      if (data.numero_factura) {
        setFormData(prev => ({ ...prev, numero_factura_original: data.numero_factura }))
        await buscarVentaPorFactura(data.numero_factura)
      }

      // Pre-llenar otros campos
      if (data.referencia_producto) {
        setFormData(prev => ({ ...prev, referencia_producto: data.referencia_producto }))
      }
      if (data.nombre_cliente) {
        setFormData(prev => ({ ...prev, nombre_cliente: data.nombre_cliente }))
      }
      if (data.cedula_cliente) {
        setFormData(prev => ({ ...prev, cedula_cliente: data.cedula_cliente }))
      }
      if (data.total) {
        setFormData(prev => ({ ...prev, monto_devuelto: data.total.toString() }))
      }
      if (data.cantidad_pares) {
        setFormData(prev => ({ ...prev, cantidad_pares: data.cantidad_pares.toString() }))
      }
    } catch (error) {
      console.error('❌ Error en OCR:', error)
    } finally {
      setProcessingOCR(false)
    }
  }

  const buscarVentaPorFactura = async (numeroFactura: string) => {
    try {
      const { data: venta, error } = await supabase
        .from('ventas')
        .select('*')
        .eq('numero_factura', numeroFactura)
        .single()

      if (error || !venta) {
        console.log('⚠️ Venta no encontrada en el sistema')
        setVentaEncontrada(null)
        setRequiereFacturaOriginal(true)
        alert('⚠️ Esta factura no está registrada en el sistema.\n\nPor favor, sube una foto de la factura original.')
        return
      }

      console.log('✅ Venta encontrada:', venta)
      setVentaEncontrada(venta)
      setRequiereFacturaOriginal(false)

      // Pre-llenar datos de la venta encontrada
      setFormData(prev => ({
        ...prev,
        referencia_producto: venta.referencia_producto || '',
        nombre_cliente: venta.nombre_cliente || '',
        cedula_cliente: venta.cedula_cliente || '',
        cantidad_pares: venta.cantidad_pares?.toString() || '',
        monto_devuelto: venta.total?.toString() || ''
      }))

      alert('✅ Venta encontrada en el sistema.\n\nLos datos se han cargado automáticamente.')
    } catch (error) {
      console.error('Error buscando venta:', error)
      setRequiereFacturaOriginal(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!notaDevolucionUrl) {
      alert('Debes subir una foto de la nota de devolución')
      return
    }

    if (requiereFacturaOriginal && !facturaOriginalUrl) {
      alert('Debes subir una foto de la factura original')
      return
    }

    if (!formData.numero_factura_original || !formData.referencia_producto || !formData.cantidad_pares || !formData.monto_devuelto || !formData.motivo) {
      alert('Completa todos los campos requeridos (*)')
      return
    }

    try {
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Sesión expirada')
        router.push('/login')
        return
      }

      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_id', session.user.id)
        .single()

      if (usuarioError || !usuario) {
        console.error('Error buscando usuario:', usuarioError)
        alert('Error: Usuario no encontrado en la base de datos.')
        return
      }

      // Buscar producto por referencia
      const { data: producto, error: productoError } = await supabase
        .from('productos')
        .select('*')
        .eq('codigo', formData.referencia_producto)
        .single()

      if (productoError || !producto) {
        alert(`Producto con referencia ${formData.referencia_producto} no encontrado en el inventario`)
        return
      }

      const fecha = getFechaActual()
      const hora = getHoraActual()

      // Insertar devolución
      const { error: devolucionError } = await supabase
        .from('devoluciones')
        .insert({
          fecha,
          hora,
          venta_id: ventaEncontrada?.id || null,
          numero_factura_original: formData.numero_factura_original,
          producto_id: producto.id,
          referencia_producto: formData.referencia_producto,
          cantidad_pares: parseInt(formData.cantidad_pares),
          nombre_cliente: formData.nombre_cliente || null,
          cedula_cliente: formData.cedula_cliente || null,
          monto_devuelto: parseFloat(formData.monto_devuelto),
          motivo: formData.motivo,
          observaciones: formData.observaciones || null,
          foto_nota_devolucion_url: notaDevolucionUrl,
          foto_factura_original_url: facturaOriginalUrl || null,
          registrado_por: usuario.id,
          estado: 'pendiente'
        })

      if (devolucionError) throw devolucionError

      // Actualizar stock del producto usando función RPC (bypass RLS)
      const { error: stockError } = await supabase.rpc('incrementar_stock_producto', {
        p_producto_id: producto.id,
        p_cantidad: parseInt(formData.cantidad_pares)
      })

      if (stockError) {
        console.error('Error actualizando stock:', stockError)
        alert('Advertencia: La devolución se registró pero hubo un error actualizando el inventario.')
      }

      alert('✅ Devolución registrada correctamente!')

      // Resetear formulario
      setMostrarFormulario(false)
      setNotaDevolucionFile(null)
      setNotaDevolucionPreview(null)
      setNotaDevolucionUrl(null)
      setFacturaOriginalFile(null)
      setFacturaOriginalPreview(null)
      setFacturaOriginalUrl(null)
      setVentaEncontrada(null)
      setRequiereFacturaOriginal(false)
      setFormData({
        numero_factura_original: '',
        referencia_producto: '',
        nombre_cliente: '',
        cedula_cliente: '',
        cantidad_pares: '',
        monto_devuelto: '',
        motivo: '',
        observaciones: ''
      })

      // Recargar lista de devoluciones
      loadDevoluciones()
    } catch (error: any) {
      console.error('Error registrando devolución:', error)
      alert(`Error al registrar la devolución: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const formatFechaLocal = (fechaStr: string) => {
    const [year, month, day] = fechaStr.split('-').map(Number)
    const fecha = new Date(year, month - 1, day)
    return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (loadingDevoluciones) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#ffe248' }}></div>
          <p className="mt-4" style={{ color: '#0e0142' }}>Cargando devoluciones...</p>
        </div>
      </div>
    )
  }

  if (mostrarFormulario) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/ventas')}
            className="mb-4 px-4 py-2 rounded-lg font-medium transition hover:opacity-80 flex items-center gap-2"
            style={{ backgroundColor: '#f3f1fa', color: '#6f4ec8' }}
          >
            ← Regresar a Ventas
          </button>

          <h1 className="text-3xl font-bold mb-2" style={{ color: '#0e0142' }}>
            🔄 Registrar Devolución
          </h1>
          <p className="text-gray-600">
            Toma una foto de la nota de devolución y completa los datos
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Captura de Nota de Devolución */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="font-semibold mb-4 text-lg" style={{ color: '#0e0142' }}>
              1. Foto de la Nota de Devolución
            </h2>

            {!notaDevolucionPreview ? (
              <div>
                <input
                  ref={fileInputNotaRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileSelect(e, 'nota')}
                  className="hidden"
                  id="nota-input"
                />
                <label
                  htmlFor="nota-input"
                  className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl cursor-pointer transition hover:border-yellow-400"
                  style={{ borderColor: '#a294da' }}
                >
                  <div className="text-6xl mb-2">📷</div>
                  <p className="text-sm font-medium" style={{ color: '#0e0142' }}>
                    Tomar foto / Subir imagen
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG - Máx 5MB
                  </p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={notaDevolucionPreview}
                  alt="Preview"
                  className="w-full h-96 object-contain rounded-xl bg-gray-50"
                />
                {(uploadingImage || processingOCR) && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-xl flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-sm">
                        {uploadingImage ? 'Subiendo imagen...' : 'Procesando con OCR...'}
                      </p>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setNotaDevolucionFile(null)
                    setNotaDevolucionPreview(null)
                    setNotaDevolucionUrl(null)
                    if (fileInputNotaRef.current) fileInputNotaRef.current.value = ''
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 text-xl"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Captura de Factura Original (si se requiere) */}
          {requiereFacturaOriginal && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-orange-300">
              <h2 className="font-semibold mb-4 text-lg" style={{ color: '#0e0142' }}>
                2. Foto de la Factura Original *
              </h2>
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                ⚠️ Esta venta no está registrada en el sistema. Por favor, sube una foto de la factura original.
              </div>

              {!facturaOriginalPreview ? (
                <div>
                  <input
                    ref={fileInputFacturaOriginalRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileSelect(e, 'factura_original')}
                    className="hidden"
                    id="factura-original-input"
                  />
                  <label
                    htmlFor="factura-original-input"
                    className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl cursor-pointer transition hover:border-orange-400"
                    style={{ borderColor: '#fb923c' }}
                  >
                    <div className="text-6xl mb-2">📄</div>
                    <p className="text-sm font-medium" style={{ color: '#0e0142' }}>
                      Tomar foto de la factura original
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG - Máx 5MB
                    </p>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={facturaOriginalPreview}
                    alt="Factura Original"
                    className="w-full h-96 object-contain rounded-xl bg-gray-50"
                  />
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-xl flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                        <p className="text-sm">Subiendo factura...</p>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFacturaOriginalFile(null)
                      setFacturaOriginalPreview(null)
                      setFacturaOriginalUrl(null)
                      if (fileInputFacturaOriginalRef.current) fileInputFacturaOriginalRef.current.value = ''
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 text-xl"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Información de Venta Encontrada */}
          {ventaEncontrada && (
            <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-2">✅ Venta Encontrada en el Sistema</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-green-800">
                <div><strong>Factura:</strong> {ventaEncontrada.numero_factura}</div>
                <div><strong>Fecha:</strong> {formatFechaLocal(ventaEncontrada.fecha)}</div>
                <div><strong>Cliente:</strong> {ventaEncontrada.nombre_cliente}</div>
                <div><strong>Total:</strong> ${ventaEncontrada.total?.toLocaleString('es-CO')}</div>
              </div>
            </div>
          )}

          {/* Datos de la Devolución */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="font-semibold mb-4 text-lg" style={{ color: '#0e0142' }}>
              {requiereFacturaOriginal ? '3' : '2'}. Datos de la Devolución
            </h2>

            {processingOCR && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                🤖 Extrayendo datos de la nota con IA...
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0e0142' }}>
                  Número de Factura Original *
                </label>
                <input
                  type="text"
                  value={formData.numero_factura_original}
                  onChange={(e) => setFormData({ ...formData, numero_factura_original: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="12345"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0e0142' }}>
                  Referencia del Producto *
                </label>
                <select
                  value={formData.referencia_producto}
                  onChange={(e) => setFormData({ ...formData, referencia_producto: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  required
                >
                  <option value="">Selecciona una referencia</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.codigo}>
                      {p.codigo} - {p.tipo} {p.talla}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0e0142' }}>
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  value={formData.nombre_cliente}
                  onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0e0142' }}>
                  Cédula del Cliente
                </label>
                <input
                  type="text"
                  value={formData.cedula_cliente}
                  onChange={(e) => setFormData({ ...formData, cedula_cliente: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0e0142' }}>
                  Cantidad de Pares Devueltos *
                </label>
                <input
                  type="number"
                  value={formData.cantidad_pares}
                  onChange={(e) => setFormData({ ...formData, cantidad_pares: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0e0142' }}>
                  Monto a Devolver *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.monto_devuelto}
                  onChange={(e) => setFormData({ ...formData, monto_devuelto: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1" style={{ color: '#0e0142' }}>
                Motivo de la Devolución *
              </label>
              <select
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                required
              >
                <option value="">Selecciona un motivo</option>
                <option value="Producto defectuoso">Producto defectuoso</option>
                <option value="Talla incorrecta">Talla incorrecta</option>
                <option value="No le gustó al cliente">No le gustó al cliente</option>
                <option value="Error en la venta">Error en la venta</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1" style={{ color: '#0e0142' }}>
                Observaciones
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                rows={3}
                placeholder="Detalles adicionales..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || uploadingImage || processingOCR || !notaDevolucionUrl || (requiereFacturaOriginal && !facturaOriginalUrl)}
            className="w-full py-4 rounded-xl font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#ffe248', color: '#0e0142' }}
          >
            {loading ? 'Registrando...' : '✅ Registrar Devolución'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/admin/ventas')}
          className="mb-4 px-4 py-2 rounded-lg font-medium transition hover:opacity-80 flex items-center gap-2"
          style={{ backgroundColor: '#f3f1fa', color: '#6f4ec8' }}
        >
          ← Regresar a Ventas
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#0e0142' }}>
              🔄 Devoluciones
            </h1>
            <p className="text-gray-600">
              Gestión de devoluciones de productos
            </p>
          </div>

          <button
            onClick={() => setMostrarFormulario(true)}
            className="px-6 py-3 rounded-lg font-bold transition hover:opacity-90 shadow-lg"
            style={{ backgroundColor: '#ffe248', color: '#0e0142' }}
          >
            ➕ Registrar Devolución
          </button>
        </div>
      </div>

      {/* Devoluciones Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {devoluciones.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">🔄</div>
            <p className="text-gray-500">No hay devoluciones registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead style={{ backgroundColor: '#f8f9fa' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nº Factura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registrado por
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {devoluciones.map((devolucion) => (
                  <tr key={devolucion.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#0e0142' }}>
                      <span className="font-mono font-semibold px-2 py-1 bg-purple-50 rounded" style={{ color: '#6f4ec8' }}>
                        {devolucion.numero_factura_original || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#0e0142' }}>
                      <div>
                        <div className="font-medium">{formatFechaLocal(devolucion.fecha)}</div>
                        <div className="text-gray-500">{devolucion.hora}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: '#0e0142' }}>
                      {devolucion.nombre_cliente || <span className="text-gray-400 text-xs">Sin datos</span>}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: '#0e0142' }}>
                      {devolucion.referencia_producto}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#0e0142' }}>
                      {devolucion.cantidad_pares} pares
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold" style={{ color: '#0e0142' }}>
                      ${devolucion.monto_devuelto.toLocaleString('es-CO')}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: '#0e0142' }}>
                      {devolucion.motivo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        devolucion.estado === 'aprobada' ? 'bg-green-100 text-green-800' :
                        devolucion.estado === 'rechazada' ? 'bg-red-100 text-red-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {devolucion.estado === 'aprobada' ? '✓ Aprobada' :
                         devolucion.estado === 'rechazada' ? '✕ Rechazada' :
                         '⏳ Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#0e0142' }}>
                      {devolucion.registrado_por_nombre}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 rounded-2xl p-4" style={{ backgroundColor: '#fff9e6', border: '1px solid #ffe248' }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: '#0e0142' }}>ℹ️ Información</h3>
        <ul className="text-sm space-y-1" style={{ color: '#5a4a0a' }}>
          <li>• Las devoluciones se registran con foto de la nota de devolución</li>
          <li>• Si la venta está en el sistema, los datos se cargan automáticamente</li>
          <li>• Si no está registrada, se debe subir foto de la factura original</li>
          <li>• El stock del producto se actualiza automáticamente al registrar la devolución</li>
        </ul>
      </div>
    </div>
  )
}
