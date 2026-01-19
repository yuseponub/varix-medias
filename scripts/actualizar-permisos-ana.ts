import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function actualizarPermisosAna() {
  try {
    console.log('🔄 Buscando usuario Ana...')

    // Buscar usuario Ana
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', 'anavarix@gmail.com')
      .single()

    if (usuarioError || !usuario) {
      console.error('❌ Usuario Ana no encontrado')
      process.exit(1)
    }

    console.log('✅ Usuario encontrado:', usuario.nombre, '(', usuario.id, ')')

    // Configurar permisos personalizados para Ana
    // Ana tiene TODOS los permisos EXCEPTO:
    // - puede_editar_inventario
    // - puede_eliminar_ventas
    // - puede_recoger_efectivo
    const { data: permisos, error: permisosError } = await supabase
      .from('permisos_usuario')
      .update({
        // Ventas
        puede_ver_ventas: true,
        puede_registrar_ventas: true,
        puede_eliminar_ventas: false, // ❌ NO PUEDE
        puede_ver_devoluciones: true,
        puede_registrar_devoluciones: true,
        puede_aprobar_devoluciones: true,

        // Compras
        puede_ver_compras: true,
        puede_registrar_compras: true,
        puede_aprobar_compras: true,
        puede_registrar_gastos: true,
        puede_aprobar_gastos: true,

        // Inventario
        puede_ver_inventario: true,
        puede_editar_inventario: false, // ❌ NO PUEDE
        puede_ver_movimientos: true,

        // Efectivo
        puede_ver_efectivo: true,
        puede_recoger_efectivo: false, // ❌ NO PUEDE
        puede_hacer_cierre_caja: true,

        // Reportes
        puede_ver_dashboard: true,
        puede_ver_historial: true,

        // Admin
        puede_gestionar_usuarios: false
      })
      .eq('usuario_id', usuario.id)
      .select()
      .single()

    if (permisosError) {
      console.error('❌ Error actualizando permisos:', permisosError)
      throw permisosError
    }

    console.log('✅ Permisos actualizados para Ana')
    console.log('\n📋 PERMISOS DE ANA:')
    console.log('  ✅ Ver y registrar ventas')
    console.log('  ❌ NO puede eliminar ventas')
    console.log('  ✅ Ver, registrar y aprobar devoluciones')
    console.log('  ✅ Ver, registrar y aprobar compras')
    console.log('  ✅ Registrar y aprobar gastos extra')
    console.log('  ✅ Ver inventario')
    console.log('  ❌ NO puede editar inventario')
    console.log('  ✅ Ver movimientos de inventario')
    console.log('  ✅ Ver efectivo')
    console.log('  ❌ NO puede recoger efectivo')
    console.log('  ✅ Hacer cierre de caja')
    console.log('  ✅ Ver dashboard e historial')
    console.log('  ❌ NO puede gestionar usuarios')
    console.log('\n🎉 Permisos de Ana actualizados exitosamente!')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

actualizarPermisosAna()
