import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Usar Service Role Key para bypassear RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('🔍 API: Cargando productos desde Supabase...')

    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('codigo', { ascending: true })

    if (error) {
      console.error('❌ API: Error cargando productos:', error)
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      )
    }

    console.log(`✅ API: ${data?.length || 0} productos cargados exitosamente`)

    if (data && data.length > 0) {
      console.log('📋 API: Primeros 3 productos:', data.slice(0, 3).map((p: any) => ({
        id: p.id,
        codigo: p.codigo,
        tipo: p.tipo,
        talla: p.talla
      })))
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    console.error('❌ API: Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado', message: error.message },
      { status: 500 }
    )
  }
}
