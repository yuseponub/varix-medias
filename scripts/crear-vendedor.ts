/**
 * Script para crear un usuario vendedor de prueba
 * Ejecutar con: npx tsx scripts/crear-vendedor.ts
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

async function crearVendedor() {
  try {
    console.log('🔧 Creando usuario vendedor de prueba...\n')

    const email = 'vendedor@varix.com'
    const password = 'vendedor123'
    const nombre = 'Juan Vendedor'

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  El usuario vendedor ya existe')
        console.log('\n📧 Email: vendedor@varix.com')
        console.log('🔑 Password: vendedor123')
        return
      }
      throw authError
    }

    console.log('✅ Usuario Auth creado')

    // 2. Crear registro en tabla usuarios
    const { error: userError } = await supabase
      .from('usuarios')
      .insert({
        auth_id: authData.user.id,
        nombre,
        email,
        rol: 'vendedor',
        activo: true
      })

    if (userError) throw userError

    console.log('✅ Usuario vendedor creado en la base de datos\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✨ Usuario vendedor creado exitosamente!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n📧 Email: vendedor@varix.com')
    console.log('🔑 Password: vendedor123')
    console.log('\n📱 Acceso vendedor: http://localhost:3000/login')
    console.log('\nInicia sesión con estas credenciales para probar el módulo de ventas.\n')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

crearVendedor()
