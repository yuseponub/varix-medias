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

async function eliminarUsuarios() {
  try {
    const emailsAEliminar = [
      'enfermera@varixcenter.com',
      'jose.romero@varixcenter.com'
    ]

    for (const email of emailsAEliminar) {
      console.log(`\n🔍 Buscando usuario: ${email}`)

      // Buscar el usuario en la tabla usuarios
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, auth_id, nombre, email')
        .eq('email', email)
        .single()

      if (usuarioError || !usuario) {
        console.log(`⚠️  Usuario no encontrado: ${email}`)
        continue
      }

      console.log(`✅ Usuario encontrado: ${usuario.nombre} (${usuario.id})`)

      // Eliminar de la tabla usuarios (esto también eliminará los permisos por CASCADE)
      const { error: deleteError } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', usuario.id)

      if (deleteError) {
        console.error(`❌ Error eliminando de tabla usuarios:`, deleteError)
        continue
      }

      console.log(`✅ Eliminado de tabla usuarios`)

      // Eliminar del sistema de autenticación de Supabase
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        usuario.auth_id
      )

      if (authDeleteError) {
        console.error(`❌ Error eliminando de auth:`, authDeleteError)
        console.log(`⚠️  El usuario fue eliminado de la tabla pero permanece en auth`)
      } else {
        console.log(`✅ Eliminado del sistema de autenticación`)
      }

      console.log(`🎉 Usuario ${email} eliminado completamente`)
    }

    console.log('\n✅ Proceso completado')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

eliminarUsuarios()
