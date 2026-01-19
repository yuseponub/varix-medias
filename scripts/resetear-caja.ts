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

async function resetearCaja() {
  try {
    console.log('🔄 Reseteando efectivo en caja a $0...')

    const { error } = await supabase
      .from('caja_efectivo')
      .update({ saldo_actual: 0 })
      .eq('id', 1)

    if (error) {
      throw error
    }

    console.log('✅ Efectivo en caja reseteado a $0')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

resetearCaja()
