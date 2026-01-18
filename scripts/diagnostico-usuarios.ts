/**
 * Script de diagnóstico para verificar usuarios
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

async function diagnosticar() {
  console.log('🔍 DIAGNÓSTICO DE USUARIOS\n')
  console.log('═══════════════════════════════════════════\n')

  // 1. Listar usuarios en Auth
  console.log('1️⃣  USUARIOS EN SUPABASE AUTH:')
  const { data: authData } = await supabase.auth.admin.listUsers()

  if (authData?.users) {
    console.log(`   Total: ${authData.users.length}\n`)
    authData.users.forEach(user => {
      console.log(`   ✓ Email: ${user.email}`)
      console.log(`     Auth ID: ${user.id}`)
      console.log(`     Creado: ${new Date(user.created_at).toLocaleString('es-CO')}\n`)
    })
  }

  console.log('═══════════════════════════════════════════\n')

  // 2. Listar usuarios en tabla usuarios
  console.log('2️⃣  USUARIOS EN TABLA "usuarios":')
  const { data: usuariosData, error: usuariosError } = await supabase
    .from('usuarios')
    .select('*')

  if (usuariosError) {
    console.error('   ❌ Error:', usuariosError.message)
  } else if (usuariosData) {
    console.log(`   Total: ${usuariosData.length}\n`)
    usuariosData.forEach(usuario => {
      console.log(`   ✓ Nombre: ${usuario.nombre}`)
      console.log(`     Email: ${usuario.email}`)
      console.log(`     Auth ID: ${usuario.auth_id}`)
      console.log(`     Rol: ${usuario.rol}\n`)
    })
  }

  console.log('═══════════════════════════════════════════\n')

  // 3. Verificar coincidencias
  console.log('3️⃣  VERIFICACIÓN DE COINCIDENCIAS:\n')

  if (authData?.users && usuariosData) {
    authData.users.forEach(authUser => {
      const matchingUser = usuariosData.find(u => u.auth_id === authUser.id)
      if (matchingUser) {
        console.log(`   ✅ ${authUser.email} → VINCULADO con ${matchingUser.nombre}`)
      } else {
        console.log(`   ❌ ${authUser.email} → NO VINCULADO (falta en tabla usuarios)`)
        console.log(`      Auth ID: ${authUser.id}`)
      }
    })
  }

  console.log('\n═══════════════════════════════════════════\n')
}

diagnosticar()
