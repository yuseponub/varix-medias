/**
 * Script para configurar la base de datos de Supabase
 * Ejecutar con: npx tsx scripts/setup-database.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupDatabase() {
  console.log('🚀 Iniciando configuración de la base de datos...\n')

  try {
    // Leer el archivo schema.sql
    const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf-8')

    console.log('📄 Ejecutando schema.sql...')

    // Dividir el schema en statements individuales
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`   Encontrados ${statements.length} comandos SQL\n`)

    // Ejecutar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'

      // Mostrar progreso
      if (statement.includes('CREATE TABLE')) {
        const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/)?.[1]
        console.log(`   ✓ Creando tabla: ${tableName}`)
      } else if (statement.includes('CREATE INDEX')) {
        const indexName = statement.match(/CREATE INDEX (\w+)/)?.[1]
        console.log(`   ✓ Creando índice: ${indexName}`)
      } else if (statement.includes('INSERT INTO')) {
        const tableName = statement.match(/INSERT INTO (\w+)/)?.[1]
        console.log(`   ✓ Insertando datos en: ${tableName}`)
      }

      // Ejecutar el statement
      const { error } = await supabase.rpc('exec_sql', { sql: statement }).single()

      if (error && !error.message.includes('already exists')) {
        console.error(`   ❌ Error: ${error.message}`)
      }
    }

    console.log('\n✅ Schema ejecutado exitosamente!\n')

  } catch (error: any) {
    console.error('❌ Error ejecutando schema:', error.message)
    console.log('\n⚠️  Ejecuta manualmente el schema.sql en Supabase SQL Editor')
  }
}

async function setupStorage() {
  console.log('📦 Configurando Storage buckets...\n')

  const buckets = [
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
        console.log(`   ✓ Bucket "${bucket.name}" creado (público: ${bucket.public})`)
      }
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message}`)
    }
  }

  console.log('\n✅ Storage configurado!\n')
}

async function createAdminUser(email: string, password: string, nombre: string) {
  console.log('👤 Creando usuario administrador...\n')

  try {
    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        rol: 'admin'
      }
    })

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log('   ⚠️  Usuario ya existe en Auth')
        return
      }
      throw authError
    }

    console.log(`   ✓ Usuario creado en Auth: ${email}`)
    console.log(`   ✓ User ID: ${authData.user.id}`)

    // Insertar en tabla usuarios
    const { error: dbError } = await supabase
      .from('usuarios')
      .insert({
        auth_id: authData.user.id,
        nombre,
        email,
        rol: 'admin',
        activo: true
      })

    if (dbError) {
      if (dbError.message.includes('duplicate')) {
        console.log('   ⚠️  Usuario ya existe en la tabla usuarios')
      } else {
        throw dbError
      }
    } else {
      console.log('   ✓ Usuario insertado en tabla usuarios')
    }

    console.log('\n✅ Usuario administrador creado exitosamente!\n')
    console.log('📧 Email:', email)
    console.log('🔑 Password:', password)
    console.log('👤 Nombre:', nombre)
    console.log('🎭 Rol: admin\n')

  } catch (error: any) {
    console.error('❌ Error creando usuario:', error.message)
  }
}

async function createVendedorUser(email: string, password: string, nombre: string) {
  console.log('👤 Creando usuario vendedor...\n')

  try {
    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        rol: 'vendedor'
      }
    })

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log('   ⚠️  Usuario ya existe en Auth')
        return
      }
      throw authError
    }

    console.log(`   ✓ Usuario creado en Auth: ${email}`)
    console.log(`   ✓ User ID: ${authData.user.id}`)

    // Insertar en tabla usuarios
    const { error: dbError } = await supabase
      .from('usuarios')
      .insert({
        auth_id: authData.user.id,
        nombre,
        email,
        rol: 'vendedor',
        activo: true
      })

    if (dbError) {
      if (dbError.message.includes('duplicate')) {
        console.log('   ⚠️  Usuario ya existe en la tabla usuarios')
      } else {
        throw dbError
      }
    } else {
      console.log('   ✓ Usuario insertado en tabla usuarios')
    }

    console.log('\n✅ Usuario vendedor creado exitosamente!\n')
    console.log('📧 Email:', email)
    console.log('🔑 Password:', password)
    console.log('👤 Nombre:', nombre)
    console.log('🎭 Rol: vendedor\n')

  } catch (error: any) {
    console.error('❌ Error creando usuario:', error.message)
  }
}

async function verifySetup() {
  console.log('🔍 Verificando configuración...\n')

  try {
    // Verificar productos
    const { data: productos, error: prodError } = await supabase
      .from('productos')
      .select('codigo, tipo, talla, stock_normal')
      .order('codigo')

    if (prodError) {
      console.log('   ⚠️  No se pudieron leer productos:', prodError.message)
    } else {
      console.log(`   ✓ Productos en DB: ${productos?.length || 0}`)
      if (productos && productos.length > 0) {
        console.log('   Primeros 3 productos:')
        productos.slice(0, 3).forEach(p => {
          console.log(`     - ${p.codigo} (${p.tipo} ${p.talla}): ${p.stock_normal} unidades`)
        })
      }
    }

    // Verificar usuarios
    const { data: usuarios, error: userError } = await supabase
      .from('usuarios')
      .select('nombre, email, rol')

    if (userError) {
      console.log('   ⚠️  No se pudieron leer usuarios:', userError.message)
    } else {
      console.log(`\n   ✓ Usuarios en DB: ${usuarios?.length || 0}`)
      usuarios?.forEach(u => {
        console.log(`     - ${u.nombre} (${u.email}) - ${u.rol}`)
      })
    }

    // Verificar caja efectivo
    const { data: caja, error: cajaError } = await supabase
      .from('caja_efectivo')
      .select('*')
      .eq('id', 1)
      .single()

    if (cajaError) {
      console.log('\n   ⚠️  No se pudo leer caja_efectivo:', cajaError.message)
    } else {
      console.log(`\n   ✓ Caja efectivo inicializada: $${caja?.saldo_actual || 0}`)
    }

    // Verificar buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.log('\n   ⚠️  No se pudieron listar buckets:', bucketsError.message)
    } else {
      console.log(`\n   ✓ Storage buckets: ${buckets?.length || 0}`)
      buckets?.forEach(b => {
        console.log(`     - ${b.name} (${b.public ? 'público' : 'privado'})`)
      })
    }

    console.log('\n✅ Verificación completada!\n')

  } catch (error: any) {
    console.error('❌ Error en verificación:', error.message)
  }
}

// Función principal
async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  VARIX MEDIAS - Setup Automático')
  console.log('═══════════════════════════════════════════\n')

  // Paso 1: Configurar storage
  await setupStorage()

  // Paso 2: Crear usuarios
  await createAdminUser(
    'jose.romero@varixcenter.com',  // Cambia esto por tu email
    'VarixAdmin2026!',                // Cambia esto por una contraseña segura
    'José Romero'
  )

  await createVendedorUser(
    'enfermera@varixcenter.com',    // Cambia esto por el email de la enfermera
    'VarixVendedor2026!',            // Cambia esto por una contraseña segura
    'Enfermera Varix'                // Cambia esto por el nombre real
  )

  // Paso 3: Verificar
  await verifySetup()

  console.log('═══════════════════════════════════════════')
  console.log('  ✅ Setup completado!')
  console.log('═══════════════════════════════════════════\n')
  console.log('⚠️  IMPORTANTE:')
  console.log('1. Guarda las credenciales en un lugar seguro')
  console.log('2. Ejecuta manualmente el schema.sql en Supabase SQL Editor')
  console.log('3. Luego ejecuta: npm run dev')
  console.log('4. Abre: http://localhost:3000\n')
}

main()
