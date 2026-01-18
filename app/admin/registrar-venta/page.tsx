'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function RegistrarVentaPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [processingOCR, setProcessingOCR] = useState(false)

  const [facturaFile, setFacturaFile] = useState<File | null>(null)
  const [facturaPreview, setFacturaPreview] = useState<string | null>(null)
  const [facturaUrl, setFacturaUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    numero_factura: '',
    nombre_cliente: '',
    cedula_cliente: '',
    total: '',
    cantidad_pares: '',
    metodo_pago: 'efectivo' as 'efectivo' | 'digital',
    observaciones: ''
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida')
      return
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy grande. Máximo 5MB')
      return
    }

    setFacturaFile(file)

    // Crear preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setFacturaPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Subir a Supabase Storage
    await uploadFactura(file)
  }

  const uploadFactura = async (file: File) => {
    try {
      setUploadingImage(true)

      const fileName = `factura_${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage
        .from('facturas')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('facturas')
        .getPublicUrl(data.path)

      setFacturaUrl(urlData.publicUrl)

      // Ejecutar OCR
      await processOCR(urlData.publicUrl)
    } catch (error) {
      console.error('Error subiendo factura:', error)
      alert('Error al subir la imagen. Intenta nuevamente.')
    } finally {
      setUploadingImage(false)
    }
  }

  const processOCR = async (imageUrl: string) => {
    try {
      setProcessingOCR(true)
      console.log('🔍 Procesando OCR para:', imageUrl)

      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error en API OCR:', errorText)
        throw new Error('Error en OCR')
      }

      const data = await response.json()
      console.log('✅ Resultado OCR:', data)

      // Pre-llenar formulario con datos extraídos
      if (data.numero_factura) {
        setFormData(prev => ({ ...prev, numero_factura: data.numero_factura }))
        console.log('📝 Número de factura extraído:', data.numero_factura)
      }
      if (data.nombre_cliente) {
        setFormData(prev => ({ ...prev, nombre_cliente: data.nombre_cliente }))
        console.log('📝 Nombre cliente extraído:', data.nombre_cliente)
      }
      if (data.cedula_cliente) {
        setFormData(prev => ({ ...prev, cedula_cliente: data.cedula_cliente }))
        console.log('📝 Cédula cliente extraída:', data.cedula_cliente)
      }
      if (data.total) {
        setFormData(prev => ({ ...prev, total: data.total.toString() }))
        console.log('📝 Total extraído:', data.total)
      }
      if (data.cantidad_pares) {
        setFormData(prev => ({ ...prev, cantidad_pares: data.cantidad_pares.toString() }))
        console.log('📝 Cantidad extraída:', data.cantidad_pares)
      }

      if (!data.total && !data.cantidad_pares && !data.numero_factura) {
        console.warn('⚠️ OCR no pudo extraer datos. Llena manualmente.')
      }
    } catch (error) {
      console.error('❌ Error en OCR:', error)
      // No mostramos error al usuario, solo continuamos con formulario manual
    } finally {
      setProcessingOCR(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!facturaUrl) {
      alert('Debes subir una foto de la factura')
      return
    }

    if (!formData.numero_factura || !formData.nombre_cliente || !formData.total || !formData.cantidad_pares) {
      alert('Completa todos los campos requeridos (*)')
      return
    }

    try {
      setLoading(true)

      // Obtener usuario actual
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
        alert('Error: Usuario no encontrado en la base de datos. Por favor contacta al administrador.')
        return
      }

      const now = new Date()
      const fecha = now.toISOString().split('T')[0]
      const hora = now.toTimeString().split(' ')[0]

      // Insertar venta
      const { data: venta, error: ventaError } = await supabase
        .from('ventas')
        .insert({
          fecha,
          hora,
          vendedor_id: usuario.id,
          numero_factura: formData.numero_factura || null,
          nombre_cliente: formData.nombre_cliente || null,
          cedula_cliente: formData.cedula_cliente || null,
          total: parseFloat(formData.total),
          cantidad_pares: parseInt(formData.cantidad_pares),
          metodo_pago: formData.metodo_pago,
          factura_url: facturaUrl,
          verificada: false,
          observaciones: formData.observaciones || null
        })
        .select()
        .single()

      if (ventaError) throw ventaError

      // Si es efectivo, actualizar caja
      if (formData.metodo_pago === 'efectivo') {
        const { data: caja } = await supabase
          .from('caja_efectivo')
          .select('saldo_actual')
          .eq('id', 1)
          .single()

        if (caja) {
          await supabase
            .from('caja_efectivo')
            .update({
              saldo_actual: caja.saldo_actual + parseFloat(formData.total),
              updated_at: new Date().toISOString()
            } as any)
            .eq('id', 1)
        }
      }

      alert('✅ Venta registrada correctamente!')

      // Redirigir a la página de ventas
      router.push('/admin/ventas')
    } catch (error: any) {
      console.error('Error registrando venta:', error)
      alert(`Error al registrar la venta: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#0e0142' }}>
          📸 Registrar Venta
        </h1>
        <p className="text-gray-600">
          Toma una foto de la factura y completa los datos
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Captura de Factura */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="font-semibold mb-4 text-lg" style={{ color: '#0e0142' }}>
            1. Foto de la Factura
          </h2>

          {!facturaPreview ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                id="factura-input"
              />
              <label
                htmlFor="factura-input"
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
                src={facturaPreview}
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
                  setFacturaFile(null)
                  setFacturaPreview(null)
                  setFacturaUrl(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 text-xl"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Datos de la Venta */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="font-semibold mb-4 text-lg" style={{ color: '#0e0142' }}>
            2. Datos de la Venta
          </h2>

          {processingOCR && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              🤖 Extrayendo datos de la factura con IA...
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0e0142' }}>
                Número de Factura *
              </label>
              <input
                type="text"
                value={formData.numero_factura}
                onChange={(e) => setFormData({ ...formData, numero_factura: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                placeholder="12345"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0e0142' }}>
                Nombre del Cliente *
              </label>
              <input
                type="text"
                value={formData.nombre_cliente}
                onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                placeholder="Juan Pérez"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0e0142' }}>
                Cédula del Cliente (opcional)
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
                Total de la Venta *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.total}
                onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0e0142' }}>
                Cantidad de Pares *
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
              <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
                Método de Pago *
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, metodo_pago: 'efectivo' })}
                  className={`flex-1 py-2 rounded-lg font-medium transition ${
                    formData.metodo_pago === 'efectivo'
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                  style={{
                    backgroundColor: formData.metodo_pago === 'efectivo' ? '#ffe248' : undefined,
                    color: formData.metodo_pago === 'efectivo' ? '#0e0142' : undefined
                  }}
                >
                  💵 Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, metodo_pago: 'digital' })}
                  className={`flex-1 py-2 rounded-lg font-medium transition ${
                    formData.metodo_pago === 'digital'
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                  style={{
                    backgroundColor: formData.metodo_pago === 'digital' ? '#a294da' : undefined,
                    color: formData.metodo_pago === 'digital' ? 'white' : undefined
                  }}
                >
                  💳 Digital
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1" style={{ color: '#0e0142' }}>
              Observaciones (opcional)
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              rows={3}
              placeholder="Notas adicionales..."
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || uploadingImage || processingOCR || !facturaUrl}
          className="w-full py-4 rounded-xl font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#ffe248', color: '#0e0142' }}
        >
          {loading ? 'Registrando...' : '✅ Registrar Venta'}
        </button>
      </form>

      {/* Info */}
      <div className="mt-6 rounded-2xl p-4" style={{ backgroundColor: '#fff9e6', border: '1px solid #ffe248' }}>
        <p className="text-sm" style={{ color: '#5a4a0a' }}>
          ℹ️ Después de registrar la venta, podrás verla en el listado de ventas.
        </p>
      </div>
    </div>
  )
}
