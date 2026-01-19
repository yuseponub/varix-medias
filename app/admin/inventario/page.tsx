'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getFechaActual } from '@/lib/utils/dates'

interface Producto {
  id: string
  codigo: string
  tipo: 'muslo' | 'panty' | 'rodilla'
  talla: string
  precio_venta: number
  precio_compra: number
  stock_normal: number
  stock_devoluciones: number
}

export default function InventarioPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState<Producto[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStock, setEditStock] = useState<number>(0)
  const [filter, setFilter] = useState<'all' | 'muslo' | 'panty' | 'rodilla'>('all')

  useEffect(() => {
    checkAuth()
    loadProductos()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const role = localStorage.getItem('user_role')
    if (role !== 'admin') {
      router.push('/vendedor/vender')
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
    } finally {
      setLoading(false)
    }
  }

  const handleEditStock = (producto: Producto) => {
    setEditingId(producto.id)
    setEditStock(producto.stock_normal)
  }

  const handleSaveStock = async (productoId: string) => {
    try {
      const producto = productos.find(p => p.id === productoId)
      if (!producto) return

      // Obtener el usuario actual de Supabase
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Sesión expirada. Por favor inicia sesión nuevamente.')
        router.push('/login')
        return
      }

      // Obtener datos del usuario desde la tabla usuarios
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_id', session.user.id)
        .single()

      if (!usuario) {
        alert('Error: Usuario no encontrado')
        return
      }

      // Actualizar el stock localmente primero
      const updatedProductos = productos.map(p =>
        p.id === productoId ? { ...p, stock_normal: editStock } : p
      )
      setProductos(updatedProductos)

      // Actualizar en la base de datos
      const { error: updateError } = await supabase
        .from('productos')
        .update({
          stock_normal: editStock,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', productoId)

      if (updateError) {
        console.error('Error actualizando producto:', updateError)
        // Revertir el cambio local si falla
        setProductos(productos)
        throw updateError
      }

      // Registrar movimiento (opcional, no afecta la actualización del stock)
      try {
        await supabase.from('movimientos_inventario').insert({
          fecha: getFechaActual(),
          hora: new Date().toTimeString().split(' ')[0],
          producto_id: productoId,
          tipo: 'ajuste',
          cantidad: editStock - producto.stock_normal,
          stock_anterior: producto.stock_normal,
          stock_nuevo: editStock,
          referencia: 'ajuste_manual',
          usuario_id: usuario.id,
          observaciones: 'Ajuste manual desde inventario'
        })
      } catch (movError) {
        console.log('Nota: Movimiento no registrado, pero stock actualizado:', movError)
      }

      setEditingId(null)
      alert('✅ Stock actualizado correctamente!')
    } catch (error: any) {
      console.error('Error actualizando stock:', error)
      alert(`Error al actualizar el stock: ${error.message || 'Error desconocido'}`)
    }
  }

  const handleMoverDevolucion = async (productoId: string) => {
    const producto = productos.find(p => p.id === productoId)
    if (!producto || producto.stock_devoluciones === 0) return

    const confirmar = confirm(`¿Mover ${producto.stock_devoluciones} unidades de devoluciones a stock normal?`)
    if (!confirmar) return

    try {
      const { error } = await supabase
        .from('productos')
        .update({
          stock_normal: producto.stock_normal + producto.stock_devoluciones,
          stock_devoluciones: 0
        })
        .eq('id', productoId)

      if (error) throw error

      // Registrar movimiento
      const userId = localStorage.getItem('user_id')
      await supabase.from('movimientos_inventario').insert({
        fecha: getFechaActual(),
        hora: new Date().toTimeString().split(' ')[0],
        producto_id: productoId,
        tipo: 'devolucion',
        cantidad: producto.stock_devoluciones,
        stock_anterior: producto.stock_normal,
        stock_nuevo: producto.stock_normal + producto.stock_devoluciones,
        referencia: 'devolucion_aprobada',
        usuario_id: userId,
        observaciones: 'Devoluciones movidas a stock normal'
      })

      loadProductos()
    } catch (error) {
      console.error('Error moviendo devoluciones:', error)
      alert('Error al mover devoluciones')
    }
  }

  const filteredProductos = productos.filter(p =>
    filter === 'all' || p.tipo === filter
  )

  const stockCritico = productos.filter(p => p.stock_normal < 5).length
  const totalUnidades = productos.reduce((sum, p) => sum + p.stock_normal, 0)
  const totalDevoluciones = productos.reduce((sum, p) => sum + p.stock_devoluciones, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando inventario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📦 Inventario de Medias</h1>
              <p className="text-sm text-gray-600">Gestión de stock y productos</p>
            </div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              ← Volver al Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600 mb-1">Total Unidades</p>
            <p className="text-3xl font-bold text-gray-900">{totalUnidades}</p>
            <p className="text-xs text-gray-500 mt-1">Stock disponible para venta</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600 mb-1">En Devoluciones</p>
            <p className="text-3xl font-bold text-gray-900">{totalDevoluciones}</p>
            <p className="text-xs text-gray-500 mt-1">Pendientes de revisión</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
            <p className="text-sm text-gray-600 mb-1">Stock Crítico</p>
            <p className="text-3xl font-bold text-gray-900">{stockCritico}</p>
            <p className="text-xs text-gray-500 mt-1">Productos con menos de 5 unidades</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({productos.length})
            </button>
            <button
              onClick={() => setFilter('muslo')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'muslo'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Muslo ({productos.filter(p => p.tipo === 'muslo').length})
            </button>
            <button
              onClick={() => setFilter('panty')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'panty'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Panty ({productos.filter(p => p.tipo === 'panty').length})
            </button>
            <button
              onClick={() => setFilter('rodilla')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'rodilla'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rodilla ({productos.filter(p => p.tipo === 'rodilla').length})
            </button>
          </div>
        </div>

        {/* Productos Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Talla
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Venta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Normal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Devoluciones
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProductos.map((producto) => (
                  <tr key={producto.id} className={producto.stock_normal < 5 ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {producto.codigo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {producto.tipo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {producto.talla}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${producto.precio_venta.toLocaleString('es-CO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === producto.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editStock}
                            onChange={(e) => setEditStock(parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                            min="0"
                          />
                          <button
                            onClick={() => handleSaveStock(producto.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-red-600 hover:text-red-700"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${
                            producto.stock_normal < 5 ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {producto.stock_normal}
                          </span>
                          <button
                            onClick={() => handleEditStock(producto)}
                            className="text-blue-600 hover:text-blue-700 text-xs"
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-yellow-600 font-semibold">
                          {producto.stock_devoluciones}
                        </span>
                        {producto.stock_devoluciones > 0 && (
                          <button
                            onClick={() => handleMoverDevolucion(producto.id)}
                            className="text-xs text-green-600 hover:text-green-700"
                            title="Mover a stock normal"
                          >
                            → Normal
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-blue-600 hover:text-blue-700">
                        Ver historial
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Información</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Stock Normal:</strong> Medias disponibles para venta</li>
            <li>• <strong>Devoluciones:</strong> Medias devueltas pendientes de revisión (solo tú puedes moverlas a stock normal)</li>
            <li>• <strong>Stock Crítico:</strong> Productos con menos de 5 unidades (marcados en rojo)</li>
            <li>• Click en ✏️ para editar el stock manualmente</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
