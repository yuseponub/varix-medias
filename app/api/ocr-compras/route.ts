import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json()
    console.log('📥 Recibida petición OCR para:', imageUrl)

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      console.warn('⚠️ ANTHROPIC_API_KEY no configurada, OCR deshabilitado')
      return NextResponse.json({
        error: 'API key no configurada',
        proveedor: null,
        productos: [],
        total: null,
        message: 'OCR no disponible - configura ANTHROPIC_API_KEY'
      })
    }

    console.log('✅ API key encontrada, procediendo con OCR...')

    // Descargar el documento (PDF o imagen)
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error('No se pudo descargar el documento')
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    // Determinar el tipo de contenido
    let contentType = imageResponse.headers.get('content-type') || 'application/pdf'

    // Si es PDF, usar application/pdf
    if (imageUrl.toLowerCase().endsWith('.pdf')) {
      contentType = 'application/pdf'
    }

    console.log('Tipo de contenido detectado:', contentType)
    console.log('Tamaño del archivo:', imageBuffer.byteLength, 'bytes')

    // Llamar a Claude API para OCR
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              ...(contentType === 'application/pdf' ? [{
                type: 'document' as const,
                source: {
                  type: 'base64' as const,
                  media_type: contentType as 'application/pdf',
                  data: base64Image
                },
                cache_control: { type: 'ephemeral' as const }
              }] : [{
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: contentType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: base64Image
                }
              }]),
              {
                type: 'text',
                text: `Eres un experto en OCR especializado en facturas de compra de medias médicas.

**TU TAREA:**
Analiza esta factura de compra y extrae la información de los productos vendidos.

**PRODUCTOS VÁLIDOS (memorizalos):**
Solo existen estos 11 productos en el inventario:

MUSLO:
- 74113 (Muslo M)
- 74114 (Muslo L)
- 74115 (Muslo XL)
- 74116 (Muslo XXL)

PANTY:
- 75406 (Panty M)
- 75407 (Panty L)
- 75408 (Panty XL)
- 75409 (Panty XXL)

RODILLA:
- 79321 (Rodilla M)
- 79322 (Rodilla L)
- 79323 (Rodilla XL)

**INSTRUCCIONES:**
1. Identifica el nombre del proveedor
2. Extrae TODOS los productos listados en la factura
3. Para cada producto:
   - Identifica el tipo (Muslo/Panty/Rodilla)
   - Identifica la talla (M/L/XL/XXL)
   - Convierte a referencia usando la tabla de arriba
   - Extrae la cantidad de pares
   - Extrae el precio unitario
4. Calcula el total de la compra

**FORMATO DE RESPUESTA:**
Responde ÚNICAMENTE con un objeto JSON válido en este formato exacto:

{
  "proveedor": "Nombre del proveedor",
  "productos": [
    {
      "referencia": "74113",
      "cantidad": 10,
      "precio_unitario": 50000
    }
  ],
  "total": 500000
}

**REGLAS:**
- Si NO encuentras el proveedor, usa "Proveedor no identificado"
- Si NO encuentras productos, devuelve array vacío
- Si NO encuentras el total, calcula la suma de (cantidad × precio_unitario) de todos los productos
- Devuelve SOLO el JSON, sin texto adicional`
              }
            ]
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error de Claude API (status', response.status, '):', errorText)
      return NextResponse.json({
        error: `Error en la API de Claude (${response.status})`,
        details: errorText,
        proveedor: null,
        productos: [],
        total: null
      }, { status: 500 })
    }

    const data = await response.json()
    const textContent = data.content[0].text

    let extractedData
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0])
      } else {
        extractedData = { proveedor: null, productos: [], total: null }
      }
    } catch (parseError) {
      console.error('Error parseando respuesta de Claude:', parseError)
      extractedData = { proveedor: null, productos: [], total: null }
    }

    return NextResponse.json(extractedData)
  } catch (error: any) {
    console.error('Error en OCR:', error)
    return NextResponse.json(
      {
        error: 'Error procesando OCR',
        proveedor: null,
        productos: [],
        total: null
      },
      { status: 500 }
    )
  }
}
