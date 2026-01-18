/**
 * Script para configurar Supabase Storage y Usuarios
 * Ejecutar con: npm run setup
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no encontradas')
  console.error('   Asegúrate de que .env.local existe y contiene:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupStorage() {
  console.log('📦 Configurando Storage buckets...\n')

  const buckets = [
    { name: 'facturas', public: true },
    { name: 'recibos-ventas', public: true },
    { name: 'comprobantes-pago', public: true },
    { name: 'facturas-compras', public: true },
    { name: 'devoluciones', public: true },
    { name: 'efectivo', public: true }
  ]

  for (const bucket of buckets) {
    try {
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
      })

      if (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⚠️  Bucket "${bucket.name}" ya existe`)
        } else {
          console.error(`   ❌ Error creando "${bucket.name}":`, error.message)
        }
      } else {
        console.log(`   ✓ Bucket "${bucket.name}" creado`)
      }
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message}`)
    }
  }

  console.log('\n✅ Storage configurado!\n')
}

async function createUser(email: string, password: string, nombre: string, rol: 'admin' | 'vendedor') {
  console.log(`👤 Creando usuario ${rol}...\n`)

  try {
    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        rol
      }
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('   ⚠️  Usuario ya existe en Auth')
        // Intentar obtener el usuario existente
        const { data: users } = await supabase.auth.admin.listUsers()
        const existingUser = users.users.find(u => u.email === email)
        if (existingUser) {
          console.log(`   ℹ️  User ID existente: ${existingUser.id}`)
          // Intentar insertar en tabla usuarios
          await insertUsuario(existingUser.id, nombre, email, rol)
        }
        return
      }
      throw authError
    }

    console.log(`   ✓ Usuario creado en Auth: ${email}`)
    console.log(`   ✓ User ID: ${authData.user.id}`)

    // Insertar en tabla usuarios
    await insertUsuario(authData.user.id, nombre, email, rol)

    console.log('\n✅ Usuario creado exitosamente!\n')
    console.log(`📧 Email: ${email}`)
    console.log(`🔑 Password: ${password}`)
    console.log(`👤 Nombre: ${nombre}`)
    console.log(`🎭 Rol: ${rol}\n`)

  } catch (error: any) {
    console.error('❌ Error creando usuario:', error.message)
  }
}

async function insertUsuario(authId: string, nombre: string, email: string, rol: 'admin' | 'vendedor') {
  const { error: dbError } = await supabase
    .from('usuarios')
    .insert({
      auth_id: authId,
      nombre,
      email,
      rol,
      activo: true
    })

  if (dbError) {
    if (dbError.message.includes('duplicate') || dbError.message.includes('unique')) {
      console.log('   ⚠️  Usuario ya existe en la tabla usuarios')
    } else {
      console.error('   ❌ Error insertando en tabla usuarios:', dbError.message)
    }
  } else {
    console.log('   ✓ Usuario insertado en tabla usuarios')
  }
}

async function verifySetup() {
  console.log('🔍 Verificando configuración...\n')

  try {
    // Verificar buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.log('   ⚠️  No se pudieron listar buckets:', bucketsError.message)
    } else {
      console.log(`   ✓ Storage buckets creados: ${buckets?.length || 0}`)
      buckets?.forEach(b => {
        console.log(`     - ${b.name}`)
      })
    }

    // Verificar usuarios
    const { data: usuarios, error: userError } = await supabase
      .from('usuarios')
      .select('nombre, email, rol')

    if (userError) {
      console.log('\n   ⚠️  No se pudieron leer usuarios:', userError.message)
      console.log('   ℹ️  Probablemente necesitas ejecutar el schema.sql primero')
    } else {
      console.log(`\n   ✓ Usuarios en DB: ${usuarios?.length || 0}`)
      usuarios?.forEach(u => {
        console.log(`     - ${u.nombre} (${u.email}) - ${u.rol}`)
      })
    }

    console.log('\n')

  } catch (error: any) {
    console.error('❌ Error en verificación:', error.message)
  }
}

// Función principal
async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  🏥 VARIX MEDIAS - Setup Automático')
  console.log('═══════════════════════════════════════════\n')

  // Paso 1: Configurar storage
  await setupStorage()

  // Paso 2: Crear usuarios
  console.log('═══════════════════════════════════════════')
  console.log('  Creando Usuarios')
  console.log('═══════════════════════════════════════════\n')

  await createUser(
    'jose.romero@varixcenter.com',
    'VarixAdmin2026!',
    'José Romero',
    'admin'
  )

  await createUser(
    'enfermera@varixcenter.com',
    'VarixVendedor2026!',
    'Enfermera Varix',
    'vendedor'
  )

  // Paso 3: Verificar
  console.log('═══════════════════════════════════════════')
  console.log('  Verificación')
  console.log('═══════════════════════════════════════════\n')

  await verifySetup()

  console.log('═══════════════════════════════════════════')
  console.log('  ✅ Setup completado!')
  console.log('═══════════════════════════════════════════\n')
  console.log('📝 PRÓXIMOS PASOS:\n')
  console.log('1. Ir a: https://supabase.com/dashboard/project/mrpxtfoykpagjgzeyyrt')
  console.log('2. Click en "SQL Editor" → "New query"')
  console.log('3. Copiar y pegar TODO el contenido de: supabase/schema.sql')
  console.log('4. Click "Run" (botón verde)')
  console.log('5. Esperar a que termine')
  console.log('6. Ejecutar: npm run dev')
  console.log('7. Abrir: http://localhost:3000\n')
  console.log('🔐 CREDENCIALES CREADAS:\n')
  console.log('Admin:')
  console.log('  Email: jose.romero@varixcenter.com')
  console.log('  Password: VarixAdmin2026!\n')
  console.log('Vendedor:')
  console.log('  Email: enfermera@varixcenter.com')
  console.log('  Password: VarixVendedor2026!\n')
  console.log('⚠️  Cambia estas contraseñas después del primer login!\n')
}

main()
