/**
 * Script para arreglar el usuario vendedor
 * Solo inserta en la tabla usuarios si ya existe en Auth
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixVendedor() {
  try {
    console.log('🔧 Arreglando usuario vendedor...\n')

    const email = 'enfermera@varixcenter.com'
    const nombre = 'Enfermera Varix'

    // 1. Buscar usuario en Auth
    const { data: users } = await supabase.auth.admin.listUsers()
    const authUser = users.users.find(u => u.email === email)

    if (!authUser) {
      console.error('❌ Usuario no encontrado en Auth')
      process.exit(1)
    }

    console.log(`✅ Usuario encontrado en Auth: ${authUser.id}`)

    // 2. Verificar si ya existe en tabla usuarios
    const { data: existing } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_id', authUser.id)
      .single()

    if (existing) {
      console.log('✅ Usuario ya existe en tabla usuarios')
      console.log(`   Nombre: ${existing.nombre}`)
      console.log(`   Email: ${existing.email}`)
      console.log(`   Rol: ${existing.rol}`)
      return
    }

    // 3. Insertar en tabla usuarios
    const { error } = await supabase
      .from('usuarios')
      .insert({
        auth_id: authUser.id,
        nombre,
        email,
        rol: 'vendedor',
        activo: true
      })

    if (error) throw error

    console.log('\n✅ Usuario vendedor arreglado!')
    console.log(`📧 Email: ${email}`)
    console.log(`👤 Nombre: ${nombre}`)
    console.log(`🎭 Rol: vendedor`)

  } catch (error: any) {
    console.error('❌ Error:', error.message || error)
    process.exit(1)
  }
}

fixVendedor()
