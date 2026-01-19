'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Permisos {
  id: string
  usuario_id: string
  puede_ver_ventas: boolean
  puede_registrar_ventas: boolean
  puede_eliminar_ventas: boolean
  puede_ver_devoluciones: boolean
  puede_registrar_devoluciones: boolean
  puede_aprobar_devoluciones: boolean
  puede_ver_compras: boolean
  puede_registrar_compras: boolean
  puede_aprobar_compras: boolean
  puede_registrar_gastos: boolean
  puede_aprobar_gastos: boolean
  puede_ver_inventario: boolean
  puede_editar_inventario: boolean
  puede_ver_movimientos: boolean
  puede_ver_efectivo: boolean
  puede_recoger_efectivo: boolean
  puede_hacer_cierre_caja: boolean
  puede_ver_dashboard: boolean
  puede_ver_historial: boolean
  puede_gestionar_usuarios: boolean
}

interface Usuario {
  id: string
  nombre: string
  email: string
  rol: string
  activo: boolean
  permisos?: Permisos
}

export default function UsuariosPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null)
  const [permisosEditando, setPermisosEditando] = useState<Permisos | null>(null)

  useEffect(() => {
    cargarUsuarios()
  }, [])

  const cargarUsuarios = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          permisos_usuario (*)
        `)
        .order('nombre')

      if (error) {
        console.error('Error en query:', error)
        throw error
      }

      console.log('Usuarios cargados:', data)

      const usuariosConPermisos = data.map(u => ({
        ...u,
        permisos: u.permisos_usuario?.[0] || null
      }))

      console.log('Usuarios con permisos procesados:', usuariosConPermisos)
      setUsuarios(usuariosConPermisos)
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      alert('Error cargando usuarios')
    } finally {
      setLoading(false)
    }
  }

  const editarPermisos = (usuario: Usuario) => {
    console.log('Editando permisos de:', usuario)
    console.log('Permisos actuales:', usuario.permisos)
    setUsuarioSeleccionado(usuario)

    // Si no hay permisos, crear permisos por defecto
    if (usuario.permisos) {
      setPermisosEditando({ ...usuario.permisos })
    } else {
      // Permisos por defecto para vendedor
      setPermisosEditando({
        id: '',
        usuario_id: usuario.id,
        puede_ver_ventas: true,
        puede_registrar_ventas: true,
        puede_eliminar_ventas: false,
        puede_ver_devoluciones: true,
        puede_registrar_devoluciones: true,
        puede_aprobar_devoluciones: false,
        puede_ver_compras: false,
        puede_registrar_compras: false,
        puede_aprobar_compras: false,
        puede_registrar_gastos: false,
        puede_aprobar_gastos: false,
        puede_ver_inventario: true,
        puede_editar_inventario: false,
        puede_ver_movimientos: false,
        puede_ver_efectivo: false,
        puede_recoger_efectivo: false,
        puede_hacer_cierre_caja: false,
        puede_ver_dashboard: true,
        puede_ver_historial: false,
        puede_gestionar_usuarios: false
      })
    }
  }

  const togglePermiso = (campo: keyof Permisos) => {
    if (!permisosEditando) {
      console.error('No hay permisos editando')
      return
    }
    setPermisosEditando({
      ...permisosEditando,
      [campo]: !permisosEditando[campo]
    })
  }

  const guardarPermisos = async () => {
    if (!usuarioSeleccionado || !permisosEditando) return

    setSaving(true)
    try {
      // Si no tiene ID, es un nuevo registro (insert), si tiene ID es update
      if (permisosEditando.id) {
        // UPDATE
        const { error } = await supabase
          .from('permisos_usuario')
          .update({
            puede_ver_ventas: permisosEditando.puede_ver_ventas,
            puede_registrar_ventas: permisosEditando.puede_registrar_ventas,
            puede_eliminar_ventas: permisosEditando.puede_eliminar_ventas,
            puede_ver_devoluciones: permisosEditando.puede_ver_devoluciones,
            puede_registrar_devoluciones: permisosEditando.puede_registrar_devoluciones,
            puede_aprobar_devoluciones: permisosEditando.puede_aprobar_devoluciones,
            puede_ver_compras: permisosEditando.puede_ver_compras,
            puede_registrar_compras: permisosEditando.puede_registrar_compras,
            puede_aprobar_compras: permisosEditando.puede_aprobar_compras,
            puede_registrar_gastos: permisosEditando.puede_registrar_gastos,
            puede_aprobar_gastos: permisosEditando.puede_aprobar_gastos,
            puede_ver_inventario: permisosEditando.puede_ver_inventario,
            puede_editar_inventario: permisosEditando.puede_editar_inventario,
            puede_ver_movimientos: permisosEditando.puede_ver_movimientos,
            puede_ver_efectivo: permisosEditando.puede_ver_efectivo,
            puede_recoger_efectivo: permisosEditando.puede_recoger_efectivo,
            puede_hacer_cierre_caja: permisosEditando.puede_hacer_cierre_caja,
            puede_ver_dashboard: permisosEditando.puede_ver_dashboard,
            puede_ver_historial: permisosEditando.puede_ver_historial,
            puede_gestionar_usuarios: permisosEditando.puede_gestionar_usuarios,
          })
          .eq('usuario_id', usuarioSeleccionado.id)

        if (error) throw error
      } else {
        // INSERT
        const { error } = await supabase
          .from('permisos_usuario')
          .insert({
            usuario_id: usuarioSeleccionado.id,
            puede_ver_ventas: permisosEditando.puede_ver_ventas,
            puede_registrar_ventas: permisosEditando.puede_registrar_ventas,
            puede_eliminar_ventas: permisosEditando.puede_eliminar_ventas,
            puede_ver_devoluciones: permisosEditando.puede_ver_devoluciones,
            puede_registrar_devoluciones: permisosEditando.puede_registrar_devoluciones,
            puede_aprobar_devoluciones: permisosEditando.puede_aprobar_devoluciones,
            puede_ver_compras: permisosEditando.puede_ver_compras,
            puede_registrar_compras: permisosEditando.puede_registrar_compras,
            puede_aprobar_compras: permisosEditando.puede_aprobar_compras,
            puede_registrar_gastos: permisosEditando.puede_registrar_gastos,
            puede_aprobar_gastos: permisosEditando.puede_aprobar_gastos,
            puede_ver_inventario: permisosEditando.puede_ver_inventario,
            puede_editar_inventario: permisosEditando.puede_editar_inventario,
            puede_ver_movimientos: permisosEditando.puede_ver_movimientos,
            puede_ver_efectivo: permisosEditando.puede_ver_efectivo,
            puede_recoger_efectivo: permisosEditando.puede_recoger_efectivo,
            puede_hacer_cierre_caja: permisosEditando.puede_hacer_cierre_caja,
            puede_ver_dashboard: permisosEditando.puede_ver_dashboard,
            puede_ver_historial: permisosEditando.puede_ver_historial,
            puede_gestionar_usuarios: permisosEditando.puede_gestionar_usuarios,
          })

        if (error) throw error
      }

      alert('Permisos actualizados exitosamente')
      setUsuarioSeleccionado(null)
      setPermisosEditando(null)
      await cargarUsuarios()
    } catch (error) {
      console.error('Error guardando permisos:', error)
      alert('Error guardando permisos: ' + JSON.stringify(error))
    } finally {
      setSaving(false)
    }
  }

  const toggleActivo = async (usuario: Usuario) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ activo: !usuario.activo })
        .eq('id', usuario.id)

      if (error) throw error

      await cargarUsuarios()
    } catch (error) {
      console.error('Error actualizando estado:', error)
      alert('Error actualizando estado del usuario')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#ffe248' }}></div>
          <p className="mt-4" style={{ color: '#0e0142' }}>Cargando usuarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#0e0142' }}>
          👥 Gestión de Usuarios
        </h1>
        <p className="text-gray-600">
          Administra los usuarios del sistema y sus permisos
        </p>
      </div>

      {/* Lista de Usuarios */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
        <table className="w-full">
          <thead style={{ backgroundColor: '#f5f3ff' }}>
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold" style={{ color: '#0e0142' }}>Usuario</th>
              <th className="px-6 py-4 text-left text-sm font-bold" style={{ color: '#0e0142' }}>Email</th>
              <th className="px-6 py-4 text-left text-sm font-bold" style={{ color: '#0e0142' }}>Rol</th>
              <th className="px-6 py-4 text-center text-sm font-bold" style={{ color: '#0e0142' }}>Estado</th>
              <th className="px-6 py-4 text-center text-sm font-bold" style={{ color: '#0e0142' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: usuario.rol === 'admin' ? '#ffe248' : '#a294da', color: usuario.rol === 'admin' ? '#0e0142' : 'white' }}
                    >
                      {usuario.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: '#0e0142' }}>{usuario.nombre}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-600">{usuario.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: usuario.rol === 'admin' ? '#fff9e6' : '#f3f1fa',
                      color: usuario.rol === 'admin' ? '#d4a700' : '#6f4ec8'
                    }}
                  >
                    {usuario.rol === 'admin' ? 'Administrador' : 'Vendedor'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => toggleActivo(usuario)}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition hover:opacity-80"
                    style={{
                      backgroundColor: usuario.activo ? '#ecfdf5' : '#fef2f2',
                      color: usuario.activo ? '#059669' : '#dc2626'
                    }}
                  >
                    <span>{usuario.activo ? '✅' : '❌'}</span>
                    {usuario.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => editarPermisos(usuario)}
                    className="px-4 py-2 rounded-lg font-medium transition hover:opacity-90"
                    style={{ backgroundColor: '#a294da', color: 'white' }}
                  >
                    ⚙️ Permisos
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Edición de Permisos */}
      {usuarioSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="sticky top-0 bg-white border-b p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: '#0e0142' }}>
                    Permisos de {usuarioSeleccionado.nombre}
                  </h2>
                  <p className="text-sm text-gray-600">{usuarioSeleccionado.email}</p>
                </div>
                <button
                  onClick={() => {
                    setUsuarioSeleccionado(null)
                    setPermisosEditando(null)
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-6">
              {/* Ventas */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#0e0142' }}>
                  💰 Ventas
                </h3>
                <div className="space-y-2">
                  <PermisoCheckbox
                    label="Ver ventas"
                    checked={permisosEditando.puede_ver_ventas}
                    onChange={() => togglePermiso('puede_ver_ventas')}
                  />
                  <PermisoCheckbox
                    label="Registrar ventas"
                    checked={permisosEditando.puede_registrar_ventas}
                    onChange={() => togglePermiso('puede_registrar_ventas')}
                  />
                  <PermisoCheckbox
                    label="Eliminar ventas"
                    checked={permisosEditando.puede_eliminar_ventas}
                    onChange={() => togglePermiso('puede_eliminar_ventas')}
                    critical
                  />
                </div>
              </div>

              {/* Devoluciones */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#0e0142' }}>
                  ↩️ Devoluciones
                </h3>
                <div className="space-y-2">
                  <PermisoCheckbox
                    label="Ver devoluciones"
                    checked={permisosEditando.puede_ver_devoluciones}
                    onChange={() => togglePermiso('puede_ver_devoluciones')}
                  />
                  <PermisoCheckbox
                    label="Registrar devoluciones"
                    checked={permisosEditando.puede_registrar_devoluciones}
                    onChange={() => togglePermiso('puede_registrar_devoluciones')}
                  />
                  <PermisoCheckbox
                    label="Aprobar devoluciones"
                    checked={permisosEditando.puede_aprobar_devoluciones}
                    onChange={() => togglePermiso('puede_aprobar_devoluciones')}
                  />
                </div>
              </div>

              {/* Compras */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#0e0142' }}>
                  🛒 Compras
                </h3>
                <div className="space-y-2">
                  <PermisoCheckbox
                    label="Ver compras"
                    checked={permisosEditando.puede_ver_compras}
                    onChange={() => togglePermiso('puede_ver_compras')}
                  />
                  <PermisoCheckbox
                    label="Registrar compras"
                    checked={permisosEditando.puede_registrar_compras}
                    onChange={() => togglePermiso('puede_registrar_compras')}
                  />
                  <PermisoCheckbox
                    label="Aprobar compras (por recibir)"
                    checked={permisosEditando.puede_aprobar_compras}
                    onChange={() => togglePermiso('puede_aprobar_compras')}
                  />
                  <PermisoCheckbox
                    label="Registrar gastos extra"
                    checked={permisosEditando.puede_registrar_gastos}
                    onChange={() => togglePermiso('puede_registrar_gastos')}
                  />
                  <PermisoCheckbox
                    label="Aprobar gastos extra"
                    checked={permisosEditando.puede_aprobar_gastos}
                    onChange={() => togglePermiso('puede_aprobar_gastos')}
                  />
                </div>
              </div>

              {/* Inventario */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#0e0142' }}>
                  📦 Inventario
                </h3>
                <div className="space-y-2">
                  <PermisoCheckbox
                    label="Ver inventario"
                    checked={permisosEditando.puede_ver_inventario}
                    onChange={() => togglePermiso('puede_ver_inventario')}
                  />
                  <PermisoCheckbox
                    label="Editar inventario (cambiar stock)"
                    checked={permisosEditando.puede_editar_inventario}
                    onChange={() => togglePermiso('puede_editar_inventario')}
                    critical
                  />
                  <PermisoCheckbox
                    label="Ver movimientos de inventario"
                    checked={permisosEditando.puede_ver_movimientos}
                    onChange={() => togglePermiso('puede_ver_movimientos')}
                  />
                </div>
              </div>

              {/* Efectivo */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#0e0142' }}>
                  💵 Efectivo
                </h3>
                <div className="space-y-2">
                  <PermisoCheckbox
                    label="Ver efectivo"
                    checked={permisosEditando.puede_ver_efectivo}
                    onChange={() => togglePermiso('puede_ver_efectivo')}
                  />
                  <PermisoCheckbox
                    label="Recoger efectivo"
                    checked={permisosEditando.puede_recoger_efectivo}
                    onChange={() => togglePermiso('puede_recoger_efectivo')}
                    critical
                  />
                  <PermisoCheckbox
                    label="Hacer cierre de caja"
                    checked={permisosEditando.puede_hacer_cierre_caja}
                    onChange={() => togglePermiso('puede_hacer_cierre_caja')}
                  />
                </div>
              </div>

              {/* Reportes/Historial */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#0e0142' }}>
                  📊 Reportes
                </h3>
                <div className="space-y-2">
                  <PermisoCheckbox
                    label="Ver dashboard"
                    checked={permisosEditando.puede_ver_dashboard}
                    onChange={() => togglePermiso('puede_ver_dashboard')}
                  />
                  <PermisoCheckbox
                    label="Ver historial completo"
                    checked={permisosEditando.puede_ver_historial}
                    onChange={() => togglePermiso('puede_ver_historial')}
                  />
                </div>
              </div>

              {/* Administración */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#0e0142' }}>
                  ⚙️ Administración
                </h3>
                <div className="space-y-2">
                  <PermisoCheckbox
                    label="Gestionar usuarios y permisos"
                    checked={permisosEditando.puede_gestionar_usuarios}
                    onChange={() => togglePermiso('puede_gestionar_usuarios')}
                    critical
                  />
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="sticky bottom-0 bg-gray-50 border-t p-6 rounded-b-2xl flex gap-4">
              <button
                onClick={() => {
                  setUsuarioSeleccionado(null)
                  setPermisosEditando(null)
                }}
                className="flex-1 px-6 py-3 rounded-lg font-medium transition hover:opacity-90"
                style={{ backgroundColor: '#e5e7eb', color: '#0e0142' }}
              >
                Cancelar
              </button>
              <button
                onClick={guardarPermisos}
                disabled={saving}
                className="flex-1 px-6 py-3 rounded-lg font-bold transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#ffe248', color: '#0e0142' }}
              >
                {saving ? 'Guardando...' : '💾 Guardar Permisos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PermisoCheckbox({
  label,
  checked,
  onChange,
  critical = false
}: {
  label: string
  checked: boolean
  onChange: () => void
  critical?: boolean
}) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-5 h-5 rounded"
        style={{ accentColor: critical ? '#dc2626' : '#a294da' }}
      />
      <span className={`flex-1 ${critical ? 'font-medium text-red-700' : 'text-gray-700'}`}>
        {label}
        {critical && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">CRÍTICO</span>}
      </span>
    </label>
  )
}
