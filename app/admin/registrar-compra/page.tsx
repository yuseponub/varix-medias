'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getFechaActual, getHoraActual } from '@/lib/utils/dates'

interface Producto {
  id: string
  codigo: string
  tipo: 'muslo' | 'panty' | 'rodilla'
  talla: 'M' | 'L' | 'XL' | 'XXL'
  precio_compra: number
  precio_venta: number
  stock_normal: number
}

interface ProductoEnCompra {
  producto_id: string
  nombre: string
  cantidad_pares: number
  precio_unitario: number
  subtotal: number
}

export default function RegistrarCompraPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [procesandoOCR, setProcesandoOCR] = useState(false)
  const [productos, setProductos] = useState<Producto[]>([])
  const [productosEnCompra, setProductosEnCompra] = useState<ProductoEnCompra[]>([])

  // Datos de la compra
  const [proveedor, setProveedor] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [archivoUrl, setArchivoUrl] = useState<string | null>(null)

  // Selector de producto
  const [productoSeleccionado, setProductoSeleccionado] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [precioUnitario, setPrecioUnitario] = useState('')

  useEffect(() => {
    cargarProductos()
  }, [])

  const cargarProductos = async () => {
    try {
      console.log('🔍 Cargando productos del inventario desde API...')

      const response = await fetch('/api/productos', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Error de API cargando productos:', errorData)
        setProductos([])
        return
      }

      const result = await response.json()
      const data = result.data

      console.log('✅ Productos cargados desde API:', data?.length || 0)

      if (data && data.length > 0) {
        console.log('📋 Primeros productos:', data.slice(0, 3).map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          talla: p.talla
        })))
        setProductos(data)
      } else {
        console.warn('⚠️ No hay productos en el inventario')
        setProductos([])
      }
    } catch (err) {
      console.error('❌ Error inesperado cargando productos:', err)
      setProductos([])
    }
  }

  const agregarProducto = () => {
    if (!productoSeleccionado || !cantidad || !precioUnitario) {
      alert('Completa todos los campos del producto')
      return
    }

    const producto = productos.find(p => p.id === productoSeleccionado)
    if (!producto) return

    const cantidadNum = parseInt(cantidad)
    const precioNum = parseFloat(precioUnitario)
    const subtotal = cantidadNum * precioNum

    setProductosEnCompra([...productosEnCompra, {
      producto_id: producto.id,
      nombre: `${producto.tipo.charAt(0).toUpperCase() + producto.tipo.slice(1)} ${producto.talla} (${producto.codigo})`,
      cantidad_pares: cantidadNum,
      precio_unitario: precioNum,
      subtotal
    }])

    // Limpiar campos
    setProductoSeleccionado('')
    setCantidad('')
    setPrecioUnitario('')
  }

  const eliminarProducto = (index: number) => {
    setProductosEnCompra(productosEnCompra.filter((_, i) => i !== index))
  }

  const calcularTotal = () => {
    return productosEnCompra.reduce((sum, p) => sum + p.subtotal, 0)
  }

  const handleArchivoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setArchivo(file)

      // Subir archivo temporalmente para OCR
      const timestamp = Date.now()
      const nombreArchivo = `temp_${timestamp}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('compras-documentos')
        .upload(nombreArchivo, file)

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('compras-documentos')
          .getPublicUrl(nombreArchivo)

        setArchivoUrl(urlData.publicUrl)
      }
    }
  }

  const procesarConOCR = async () => {
    if (!archivoUrl) {
      alert('Primero sube un archivo')
      return
    }

    setProcesandoOCR(true)
    try {
      console.log('🔍 Iniciando OCR con URL:', archivoUrl)

      const response = await fetch('/api/ocr-compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: archivoUrl })
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data = await response.json()
      console.log('📦 Respuesta completa del OCR:', JSON.stringify(data, null, 2))

      if (data.error) {
        console.error('❌ Error del servidor OCR:', data.error)
        alert(data.message || 'Error al procesar el documento con OCR')
        return
      }

      if (data.proveedor) {
        setProveedor(data.proveedor)
        console.log('✅ Proveedor detectado:', data.proveedor)
      }

      if (data.productos && data.productos.length > 0) {
        console.log('📋 Productos detectados por OCR:', data.productos)
        console.log('📦 Productos disponibles en inventario:', productos.map(p => ({
          id: p.id,
          codigo: p.codigo,
          tipo: p.tipo,
          talla: p.talla
        })))

        const productosDetectados: ProductoEnCompra[] = []

        for (const prodOCR of data.productos) {
          console.log('🔎 Procesando producto OCR:', prodOCR)

          // Buscar el producto por su código (que contiene la referencia)
          const producto = productos.find((p: any) => {
            const codigoProducto = String(p.codigo || '')
            const referenciaOCR = String(prodOCR.referencia)
            console.log(`  🔄 Comparando código "${codigoProducto}" con referencia OCR "${referenciaOCR}"`)
            return codigoProducto === referenciaOCR
          })

          if (producto) {
            console.log('  ✅ MATCH ENCONTRADO:', {
              codigo: producto.codigo,
              tipo: producto.tipo,
              talla: producto.talla,
              cantidad: prodOCR.cantidad,
              precio: prodOCR.precio_unitario
            })
            productosDetectados.push({
              producto_id: producto.id,
              nombre: `${producto.tipo.charAt(0).toUpperCase() + producto.tipo.slice(1)} ${producto.talla} (${producto.codigo})`,
              cantidad_pares: prodOCR.cantidad,
              precio_unitario: prodOCR.precio_unitario,
              subtotal: prodOCR.cantidad * prodOCR.precio_unitario
            })
          } else {
            console.warn('  ⚠️ NO SE ENCONTRÓ MATCH para referencia:', prodOCR.referencia)
            console.warn('  📋 Códigos disponibles:', productos.map((p: any) => p.codigo).join(', '))
          }
        }

        if (productosDetectados.length > 0) {
          setProductosEnCompra(productosDetectados)

          // Calcular resumen
          const uniqueReferencias = new Set(productosDetectados.map(p => p.nombre.match(/\((\d+)\)/)?.[1]).filter(Boolean)).size
          const totalPares = productosDetectados.reduce((sum, p) => sum + p.cantidad_pares, 0)

          alert(`✅ OCR completado exitosamente.\n\nSe detectaron:\n• ${uniqueReferencias} referencias únicas\n• ${totalPares} pares en total`)
        } else {
          alert('⚠️ El OCR procesó el documento pero no pudo identificar productos del inventario.\n\nRevisa la consola para más detalles o agrega los productos manualmente.')
        }
      } else {
        console.log('⚠️ OCR no devolvió productos')
        alert('No se pudieron detectar productos automáticamente. Agrégalos manualmente.')
      }

      if (data.total) {
        console.log('💰 Total detectado:', data.total)
      }
    } catch (error) {
      console.error('❌ Error en OCR:', error)
      alert('Error al procesar el documento con OCR. Revisa la consola para más detalles.')
    } finally {
      setProcesandoOCR(false)
    }
  }

  const registrarCompra = async () => {
    if (!proveedor.trim()) {
      alert('Ingresa el nombre del proveedor')
      return
    }

    if (productosEnCompra.length === 0) {
      alert('Agrega al menos un producto a la compra')
      return
    }

    setLoading(true)
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
          .from('compras-documentos')
          .upload(nombreArchivo, archivo)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('compras-documentos')
          .getPublicUrl(nombreArchivo)

        documentoUrl = urlData.publicUrl
        documentoNombre = archivo.name
      }

      const fecha = getFechaActual()
      const hora = getHoraActual()
      const total = calcularTotal()

      // Insertar compra
      const { data: compra, error: compraError } = await supabase
        .from('compras')
        .insert({
          fecha,
          hora,
          proveedor,
          total,
          documento_url: documentoUrl,
          documento_nombre: documentoNombre,
          observaciones: observaciones || null,
          registrado_por: user.id,
          estado: 'por_recibir'
        })
        .select()
        .single()

      if (compraError) throw compraError

      // Insertar detalle de productos
      const detalles = productosEnCompra.map(p => ({
        compra_id: compra.id,
        producto_id: p.producto_id,
        cantidad_pares: p.cantidad_pares,
        precio_unitario: p.precio_unitario,
        subtotal: p.subtotal
      }))

      const { error: detalleError } = await supabase
        .from('compras_detalle')
        .insert(detalles)

      if (detalleError) throw detalleError

      alert('Compra registrada exitosamente. Ahora aparece en "Por Recibir"')

      // Limpiar formulario
      setProveedor('')
      setObservaciones('')
      setArchivo(null)
      setProductosEnCompra([])

      // Redirigir a compras
      router.push('/admin/compras')
    } catch (error) {
      console.error('Error registrando compra:', error)
      alert('Error al registrar la compra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      {/* Header con Botón de Regresar */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/admin/compras')}
          className="mb-4 px-4 py-2 rounded-lg font-medium transition hover:opacity-90"
          style={{ backgroundColor: '#e5e7eb', color: '#0e0142' }}
        >
          ← Regresar a Compras
        </button>
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#0e0142' }}>
          Registrar Compra
        </h1>
        <p className="text-gray-600">
          Registra una nueva compra de medias. Aparecerá en "Por Recibir" hasta que apruebes su llegada.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos de la Compra */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#0e0142' }}>
              Datos de la Compra
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
                  Proveedor *
                </label>
                <input
                  type="text"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  style={{ focusRingColor: '#ffe248' }}
                  placeholder="Nombre del proveedor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
                  Documento (PDF, imagen, etc.)
                </label>
                <input
                  type="file"
                  onChange={handleArchivoChange}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
                />
                {archivo && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-gray-600">
                      Archivo seleccionado: {archivo.name}
                    </p>
                    <button
                      onClick={procesarConOCR}
                      disabled={procesandoOCR}
                      className="px-4 py-2 rounded-lg font-medium transition hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#a294da', color: 'white' }}
                    >
                      {procesandoOCR ? '🔄 Procesando...' : '🤖 Extraer Datos con OCR'}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
                  Observaciones
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  style={{ focusRingColor: '#ffe248' }}
                  placeholder="Detalles adicionales de la compra..."
                />
              </div>
            </div>
          </div>

          {/* Agregar Productos */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#0e0142' }}>
              Productos
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
                  Producto *
                </label>
                <select
                  value={productoSeleccionado}
                  onChange={(e) => setProductoSeleccionado(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1)} {p.talla} ({p.codigo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
                  Cantidad (pares) *
                </label>
                <input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0e0142' }}>
                  Precio Unitario *
                </label>
                <input
                  type="number"
                  value={precioUnitario}
                  onChange={(e) => setPrecioUnitario(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            <button
              onClick={agregarProducto}
              className="w-full px-4 py-2 rounded-lg font-medium transition hover:opacity-90"
              style={{ backgroundColor: '#a294da', color: 'white' }}
            >
              + Agregar Producto
            </button>

            {/* Lista de Productos Agregados */}
            {productosEnCompra.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3" style={{ color: '#0e0142' }}>
                  Productos en esta compra:
                </h3>
                <div className="space-y-2">
                  {productosEnCompra.map((p, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium" style={{ color: '#0e0142' }}>{p.nombre}</p>
                        <p className="text-sm text-gray-600">
                          {p.cantidad_pares} pares × ${p.precio_unitario.toLocaleString('es-CO')} = ${p.subtotal.toLocaleString('es-CO')}
                        </p>
                      </div>
                      <button
                        onClick={() => eliminarProducto(index)}
                        className="ml-4 text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resumen y Botón */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#0e0142' }}>
              Resumen
            </h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Productos:</span>
                <span className="font-medium" style={{ color: '#0e0142' }}>
                  {productosEnCompra.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Pares:</span>
                <span className="font-medium" style={{ color: '#0e0142' }}>
                  {productosEnCompra.reduce((sum, p) => sum + p.cantidad_pares, 0)}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold" style={{ color: '#0e0142' }}>Total:</span>
                  <span className="text-2xl font-bold" style={{ color: '#0e0142' }}>
                    ${calcularTotal().toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={registrarCompra}
              disabled={loading || productosEnCompra.length === 0}
              className="w-full px-6 py-3 rounded-lg font-bold transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#ffe248', color: '#0e0142' }}
            >
              {loading ? 'Registrando...' : '📦 Registrar Compra'}
            </button>

            <p className="text-xs text-gray-500 mt-4 text-center">
              La compra aparecerá en "Por Recibir" hasta que apruebes su llegada
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
