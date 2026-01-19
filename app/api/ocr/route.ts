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

🔴 **PRIORIDAD CRÍTICA - CAMPO MÁS IMPORTANTE: REFERENCIA DEL PRODUCTO** 🔴

**INSTRUCCIÓN PRINCIPAL (LA MÁS IMPORTANTE):**
El campo "referencia_producto" es ABSOLUTAMENTE CRÍTICO y debe ser tu MÁXIMA PRIORIDAD. Debes esforzarte AL MÁXIMO para identificarlo, incluso si está parcialmente visible, borroso, manuscrito o poco legible.

**REFERENCIAS DE PRODUCTO VÁLIDAS (memorizalas):**
Solo existen estos 11 códigos posibles en el inventario:
- **Muslo:** 74113 (M), 74114 (L), 74115 (XL), 74116 (XXL)
- **Panty:** 75406 (M), 75407 (L), 75408 (XL), 75409 (XXL)
- **Rodilla:** 79321 (M), 79322 (L), 79323 (XL)

**ESTRATEGIA DE DETECCIÓN AGRESIVA DE REFERENCIAS (úsala siempre):**

1. **Búsqueda directa:** Busca códigos de 5 dígitos que empiecen con 7 en TODA la factura
   - Pueden aparecer como: "Ref:", "Código:", "Art:", "Artículo:", "Producto:", "SKU:", o solo el número
   - Revisa encabezados, cuerpo, pie de página, márgenes, anotaciones manuscritas

2. **Matching inteligente con IA (si no encuentras código exacto):**
   - Si ves un número parcial como "741__" → muy probablemente es 74113 o 74114
   - Si ves "754__" → muy probablemente es 75406, 75407, 75408 o 75409
   - Si ves "793__" → muy probablemente es 79321, 79322 o 79323
   - **Usa el contexto de la talla** (M, L, XL, XXL) para desambiguar:
     * Si dice "Talla M" y ves "741" → 74113
     * Si dice "Talla L" y ves "741" → 74114
     * Si dice "Talla M" y ves "754" → 75406
     * Si dice "Talla L" y ves "793" → 79322

3. **Inferencia por descripción del producto:**
   - Si dice "Media muslo" o "hasta el muslo" + "Talla M" → probablemente 74113
   - Si dice "Media panty" o "pantimedias" + "Talla L" → probablemente 75407
   - Si dice "Media rodilla" o "hasta la rodilla" + "Talla L" → probablemente 79322
   - Si dice "Media rodilla" + "Talla M" → probablemente 79321

4. **Análisis de números borrosos:**
   - Si un número de 5 dígitos empieza con 7 pero el resto es ilegible, RAZONA:
     * ¿Qué tipo de media se menciona? (muslo/panty/rodilla)
     * ¿Qué talla aparece en la factura?
     * Basándote en eso, infiere el código más probable
   - **NUNCA devuelvas null si ves CUALQUIER evidencia de un código de producto**

5. **Coincidencias parciales:**
   - "74113" o "74 113" o "74-113" → 74113
   - Si ves "Ref: 741" y "Talla: M" → inferir 74113
   - Si ves solo "74" pero dice "Media muslo M" → 74113
   - Si está manuscrito y parece "74114" pero un dígito es confuso → 74114 (confía en tu mejor interpretación)

6. **Caso extremo - última opción:**
   - Si NO encuentras ningún código pero la factura claramente describe el producto y la talla, usa tu conocimiento del inventario para hacer tu MEJOR ESTIMACIÓN
   - Ejemplo: "Media de compresión hasta el muslo, talla grande" → muy probablemente 74114 (L)
   - **Solo devuelve null si absolutamente no hay NINGUNA información sobre el producto**

**INSTRUCCIONES PARA OTROS CAMPOS (prioridad secundaria):**

7. **Números de factura:** busca "Factura", "Fact.", "No.", "#", "Número", "N°"
8. **Nombres:** busca "Nombre", "Cliente", "Paciente", "Señor(a)" - extrae nombre completo
9. **Cédulas:** busca "Cédula", "CC", "C.C.", "Identificación", "ID" - solo números sin puntos ni comas
10. **Totales:** busca "Total", "Total a Pagar", "Valor Total", "$", "COP" - usa el total final si hay descuentos
11. **Cantidad de pares:** busca "Cantidad", "Cant.", "Pares", "Unidades", "Qty" - suma si hay múltiples líneas
12. Ten en cuenta que la letra puede ser manuscrita, impresa, o mixta

**EJEMPLOS DE EXTRACCIÓN CON PRIORIDAD EN REFERENCIAS:**

Ejemplo 1 (código claro):
- Texto: "FACTURA: 00123 | REF: 74113 | CLIENTE: Maria García | CC: 1.234.567 | TOTAL: $180.000 | PARES: 3"
- Respuesta: {"numero_factura": "00123", "referencia_producto": "74113", "nombre_cliente": "Maria García", "cedula_cliente": "1234567", "total": 180000, "cantidad_pares": 3}

Ejemplo 2 (código parcialmente visible):
- Texto: "No: 456 | Art: 754__ (borroso) | Talla: L | Cliente: Ana Martínez | Total: $175,000"
- Razonamiento: 754__ + Talla L → debe ser 75407 (Panty L)
- Respuesta: {"numero_factura": "456", "referencia_producto": "75407", "nombre_cliente": "Ana Martínez", "cedula_cliente": null, "total": 175000, "cantidad_pares": null}

Ejemplo 3 (solo descripción):
- Texto: "Factura 789 | Media compresión rodilla | Talla XL | Total: $130,000 | 2 pares"
- Razonamiento: rodilla + XL → debe ser 79323
- Respuesta: {"numero_factura": "789", "referencia_producto": "79323", "nombre_cliente": null, "cedula_cliente": null, "total": 130000, "cantidad_pares": 2}

Ejemplo 4 (código manuscrito poco legible):
- Texto: "Ref: 7412? (manuscrito confuso) | Muslo | Talla M | Factura 321 | $175.000"
- Razonamiento: 7412? + Muslo + M → casi seguro 74113 (único código muslo M)
- Respuesta: {"numero_factura": "321", "referencia_producto": "74113", "nombre_cliente": null, "cedula_cliente": null, "total": 175000, "cantidad_pares": null}

Ejemplo 5 (código parcial con contexto):
- Texto: "Cod: 79 | rodilla grande | Total 130k | #555"
- Razonamiento: 79 + rodilla + "grande" (L) → debe ser 79322 (rodilla L)
- Respuesta: {"numero_factura": "555", "referencia_producto": "79322", "nombre_cliente": null, "cedula_cliente": null, "total": 130000, "cantidad_pares": null}

**AHORA ANALIZA ESTA FACTURA:**

Extrae la siguiente información (EN ORDEN DE PRIORIDAD):
1. **referencia_producto** (CRÍTICO - código de 5 dígitos, usa IA para inferir si es necesario)
2. total (valor numérico sin símbolos)
3. cantidad_pares (número de pares vendidos)
4. numero_factura (string sin símbolos ni espacios)
5. nombre_cliente (nombre completo)
6. cedula_cliente (solo números)

Responde ÚNICAMENTE con un objeto JSON válido en este formato exacto, sin texto adicional antes ni después:
{"numero_factura": "...", "referencia_producto": "...", "nombre_cliente": "...", "cedula_cliente": "...", "total": 123456, "cantidad_pares": 5}

**RECUERDA:** El campo referencia_producto es EL MÁS IMPORTANTE. Esfuérzate al máximo, usa razonamiento, contexto, y coincidencias parciales. Solo devuelve null si es absolutamente imposible inferir el producto.`
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
