import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function crearUsuarioAna() {
  try {
    console.log('🔄 Creando usuario Ana...')

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'anavarix@gmail.com',
      password: '1234',
      email_confirm: true
    })

    if (authError) {
      console.error('❌ Error creando auth user:', authError)
      throw authError
    }

    console.log('✅ Usuario de autenticación creado:', authData.user.id)

    // 2. Crear usuario en tabla usuarios
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .insert({
        auth_id: authData.user.id,
        nombre: 'Ana',
        email: 'anavarix@gmail.com',
        rol: 'vendedor',
        activo: true
      })
      .select()
      .single()

    if (usuarioError) {
      console.error('❌ Error creando usuario en tabla:', usuarioError)
      throw usuarioError
    }

    console.log('✅ Usuario creado en tabla usuarios:', usuario.id)

    // 3. Configurar permisos personalizados para Ana
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

    console.log('✅ Permisos configurados para Ana')
    console.log('\n📋 RESUMEN:')
    console.log('Email: anavarix@gmail.com')
    console.log('Contraseña: 1234')
    console.log('Rol: vendedor')
    console.log('Auth ID:', authData.user.id)
    console.log('Usuario ID:', usuario.id)
    console.log('\n✅ Permisos:')
    console.log('  ✅ Ver y registrar ventas')
    console.log('  ❌ NO puede eliminar ventas')
    console.log('  ✅ Ver y gestionar devoluciones')
    console.log('  ✅ Ver y gestionar compras')
    console.log('  ✅ Ver inventario')
    console.log('  ❌ NO puede editar inventario')
    console.log('  ✅ Ver efectivo')
    console.log('  ❌ NO puede recoger efectivo')
    console.log('  ✅ Ver dashboard e historial')
    console.log('\n🎉 Usuario Ana creado exitosamente!')

  } catch (error) {
    console.error('❌ Error general:', error)
    process.exit(1)
  }
}

crearUsuarioAna()
