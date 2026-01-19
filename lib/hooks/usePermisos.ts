import { useEffect, useState } from 'react'

interface Permisos {
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

export function usePermisos() {
  const [permisos, setPermisos] = useState<Permisos | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Cargar rol
    const role = localStorage.getItem('user_role')
    setIsAdmin(role === 'admin')

    // Cargar permisos
    const permisosStr = localStorage.getItem('user_permisos')
    if (permisosStr) {
      try {
        setPermisos(JSON.parse(permisosStr))
      } catch (e) {
        console.error('Error parsing permisos:', e)
      }
    }
  }, [])

  // Helper function para verificar un permiso específico
  const tiene = (permiso: keyof Permisos): boolean => {
    // Admin siempre tiene todos los permisos
    if (isAdmin) return true

    // Si no hay permisos cargados, denegar por defecto
    if (!permisos) return false

    return permisos[permiso] === true
  }

  return { permisos, isAdmin, tiene }
}
