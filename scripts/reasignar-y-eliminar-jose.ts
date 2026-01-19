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

async function reasignarYEliminarJose() {
  try {
    console.log('🔍 Paso 1: Buscar usuario José Romero...')

    // Buscar el usuario a eliminar
    const { data: joseRomero, error: joseError } = await supabase
      .from('usuarios')
      .select('id, auth_id, nombre, email')
      .eq('email', 'jose.romero@varixcenter.com')
      .single()

    if (joseError || !joseRomero) {
      console.error('❌ Usuario José Romero no encontrado')
      process.exit(1)
    }

    console.log(`✅ José Romero encontrado: ${joseRomero.nombre} (${joseRomero.id})`)

    console.log('\n🔍 Paso 2: Buscar usuario destino (joseromerorincon041100@gmail.com)...')

    // Buscar el usuario destino
    const { data: usuarioDestino, error: destinoError } = await supabase
      .from('usuarios')
      .select('id, nombre, email')
      .eq('email', 'joseromerorincon041100@gmail.com')
      .single()

    if (destinoError || !usuarioDestino) {
      console.error('❌ Usuario destino no encontrado')
      console.error('Error:', destinoError)
      process.exit(1)
    }

    console.log(`✅ Usuario destino encontrado: ${usuarioDestino.nombre} (${usuarioDestino.id})`)

    console.log('\n🔍 Paso 3: Contar ventas de José Romero...')

    // Contar ventas del usuario a eliminar
    const { data: ventas, error: ventasError } = await supabase
      .from('ventas')
      .select('id, numero_factura, fecha, total')
      .eq('vendedor_id', joseRomero.id)

    if (ventasError) {
      console.error('❌ Error consultando ventas:', ventasError)
      process.exit(1)
    }

    console.log(`📊 Total de ventas a reasignar: ${ventas?.length || 0}`)

    if (ventas && ventas.length > 0) {
      console.log('\n🔄 Paso 4: Reasignando ventas...')

      // Reasignar todas las ventas
      const { error: updateError } = await supabase
        .from('ventas')
        .update({ vendedor_id: usuarioDestino.id })
        .eq('vendedor_id', joseRomero.id)

      if (updateError) {
        console.error('❌ Error reasignando ventas:', updateError)
        process.exit(1)
      }

      console.log(`✅ ${ventas.length} ventas reasignadas a ${usuarioDestino.nombre}`)

      // Mostrar muestra de ventas reasignadas
      console.log('\n📋 Muestra de ventas reasignadas:')
      ventas.slice(0, 5).forEach(v => {
        console.log(`   - Factura #${v.numero_factura} (${v.fecha}) - $${Number(v.total).toLocaleString('es-CO')}`)
      })
      if (ventas.length > 5) {
        console.log(`   ... y ${ventas.length - 5} ventas más`)
      }
    }

    console.log('\n🗑️  Paso 5: Eliminando usuario José Romero de tabla usuarios...')

    // Eliminar de la tabla usuarios (CASCADE eliminará permisos)
    const { error: deleteError } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', joseRomero.id)

    if (deleteError) {
      console.error('❌ Error eliminando de tabla usuarios:', deleteError)
      process.exit(1)
    }

    console.log('✅ Eliminado de tabla usuarios')

    console.log('\n🗑️  Paso 6: Eliminando del sistema de autenticación...')

    // Eliminar del sistema de autenticación
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
      joseRomero.auth_id
    )

    if (authDeleteError) {
      console.error('❌ Error eliminando de auth:', authDeleteError)
      console.log('⚠️  El usuario fue eliminado de la tabla pero permanece en auth')
    } else {
      console.log('✅ Eliminado del sistema de autenticación')
    }

    console.log('\n🎉 PROCESO COMPLETADO EXITOSAMENTE!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`✅ Ventas reasignadas: ${ventas?.length || 0}`)
    console.log(`✅ De: ${joseRomero.email}`)
    console.log(`✅ A: ${usuarioDestino.email}`)
    console.log(`✅ Usuario eliminado: ${joseRomero.nombre}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

reasignarYEliminarJose()
