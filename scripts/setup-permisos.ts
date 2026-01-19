import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

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

async function setupPermisos() {
  try {
    console.log('🔄 Configurando sistema de permisos granulares...')

    // Leer el archivo SQL
    const sqlPath = path.resolve(__dirname, '../supabase/permisos-granulares.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('📄 Ejecutando SQL desde:', sqlPath)

    // Ejecutar el SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('❌ Error ejecutando SQL:', error)
      console.log('\n⚠️  Debes ejecutar el SQL manualmente en el SQL Editor de Supabase:')
      console.log('📁 Archivo:', sqlPath)
      console.log('\n1. Ve a https://supabase.com/dashboard')
      console.log('2. Selecciona tu proyecto')
      console.log('3. Ve a SQL Editor')
      console.log('4. Copia y pega el contenido de:', sqlPath)
      console.log('5. Ejecuta el query\n')
    } else {
      console.log('✅ Sistema de permisos configurado exitosamente')
    }

  } catch (error) {
    console.error('❌ Error:', error)

    console.log('\n⚠️  Ejecuta manualmente el SQL en Supabase:')
    console.log('📁 Archivo: supabase/permisos-granulares.sql\n')
  }
}

setupPermisos()
