import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json()

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 })
    }

    // Obtener la API key de Claude desde variables de entorno
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      console.warn('ANTHROPIC_API_KEY no configurada, OCR deshabilitado')
      return NextResponse.json({
        total: null,
        cantidad_pares: null,
        message: 'OCR no disponible'
      })
    }

    // Descargar la imagen
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error('No se pudo descargar la imagen')
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    // Determinar el tipo de imagen
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
    const mediaType = contentType.split('/')[1] || 'jpeg'

    // Llamar a Claude API para OCR
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Eres un experto en OCR especializado en facturas de medias médicas de compresión. Tu trabajo es extraer información de forma precisa y consistente.

**INSTRUCCIONES IMPORTANTES:**

1. Lee cuidadosamente toda la factura, incluyendo texto pequeño, números y cualquier información manuscrita
2. Para números de factura: busca términos como "Factura", "Fact.", "No.", "#", "Número", "N°", etc.
3. Para nombres: busca "Nombre", "Cliente", "Paciente", "Señor(a)", etc. - extrae el nombre completo
4. Para cédulas: busca "Cédula", "CC", "C.C.", "Identificación", "ID", "NIT", etc. - elimina puntos y comas, solo números
5. Para totales: busca "Total", "Total a Pagar", "Valor Total", "$", "COP", "Pesos". Si hay descuentos, usa el total final
6. Para cantidad de pares: busca "Cantidad", "Cant.", "Pares", "Unidades", "Qty". Suma todas las cantidades si hay múltiples líneas
7. Ten en cuenta que la letra puede ser manuscrita, impresa, o mixta
8. Si un campo tiene poca legibilidad, haz tu mejor esfuerzo por interpretarlo basándote en el contexto

**EJEMPLOS DE EXTRACCIÓN:**

Ejemplo 1 (factura impresa clara):
- Texto: "FACTURA: 00123 | CLIENTE: Maria García Lopez | CC: 1.234.567 | TOTAL: $180.000 | PARES: 3"
- Respuesta: {"numero_factura": "00123", "nombre_cliente": "Maria García Lopez", "cedula_cliente": "1234567", "total": 180000, "cantidad_pares": 3}

Ejemplo 2 (factura manuscrita):
- Texto: "No: 456 / Sra. Ana Martínez / Ced: 98765432 / Total a pagar: 250,000 / Cant: 5 pares"
- Respuesta: {"numero_factura": "456", "nombre_cliente": "Ana Martínez", "cedula_cliente": "98765432", "total": 250000, "cantidad_pares": 5}

Ejemplo 3 (información parcial):
- Texto: "Factura 789 | Total: $95,000"
- Respuesta: {"numero_factura": "789", "nombre_cliente": null, "cedula_cliente": null, "total": 95000, "cantidad_pares": null}

**AHORA ANALIZA ESTA FACTURA:**

Extrae la siguiente información de la factura que verás a continuación:
- numero_factura: string (solo números y letras, sin símbolos ni espacios)
- nombre_cliente: string (nombre completo del cliente)
- cedula_cliente: string (solo números, sin puntos ni comas)
- total: number (valor numérico sin símbolos de moneda ni separadores)
- cantidad_pares: number (cantidad total de pares vendidos)

Responde ÚNICAMENTE con un objeto JSON válido en este formato exacto, sin texto adicional antes ni después:
{"numero_factura": "...", "nombre_cliente": "...", "cedula_cliente": "...", "total": 123456, "cantidad_pares": 5}

Si no encuentras algún valor, usa null. Usa números para total y cantidad_pares, strings para los demás campos.`
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: contentType,
                  data: base64Image
                }
              }
            ]
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error de Claude API:', errorText)
      throw new Error('Error en la API de Claude')
    }

    const data = await response.json()
    const textContent = data.content[0].text

    // Parsear la respuesta JSON
    let extractedData
    try {
      // Intentar extraer JSON del texto
      const jsonMatch = textContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0])
      } else {
        extractedData = { total: null, cantidad_pares: null }
      }
    } catch (parseError) {
      console.error('Error parseando respuesta de Claude:', parseError)
      extractedData = { total: null, cantidad_pares: null }
    }

    return NextResponse.json(extractedData)
  } catch (error: any) {
    console.error('Error en OCR:', error)
    return NextResponse.json(
      {
        error: 'Error procesando OCR',
        total: null,
        cantidad_pares: null
      },
      { status: 500 }
    )
  }
}
