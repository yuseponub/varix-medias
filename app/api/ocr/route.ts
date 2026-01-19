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

⚠️ **IMPORTANTE:** La MAYORÍA de recibos NO tendrán el código numérico, sino el NOMBRE del producto. Debes esforzarte MUCHO en identificar el tipo de media por su nombre.

**PRODUCTOS VÁLIDOS (memorizalas - CÓDIGO y NOMBRE):**
Solo existen estos 11 productos en el inventario:

- **MUSLO / HASTA EL MUSLO / MUSLERA:**
  * 74113 (Talla M)
  * 74114 (Talla L)
  * 74115 (Talla XL)
  * 74116 (Talla XXL)

- **PANTY / PANTIMEDIA / PANTIMEDIAS / COMPLETA:**
  * 75406 (Talla M)
  * 75407 (Talla L)
  * 75408 (Talla XL)
  * 75409 (Talla XXL)

- **RODILLA / HASTA LA RODILLA / MEDIA RODILLA:**
  * 79321 (Talla M)
  * 79322 (Talla L)
  * 79323 (Talla XL)

**ESTRATEGIA DE DETECCIÓN AGRESIVA DE REFERENCIAS (úsala siempre):**

**PRIORIDAD 1: IDENTIFICAR TIPO DE MEDIA POR NOMBRE (LA MAYORÍA DE RECIBOS USARÁN EL NOMBRE, NO EL CÓDIGO)**

1. **Busca INTENSAMENTE palabras clave del tipo de media en TODA la factura:**

   **Para MUSLO (códigos 741xx):**
   - Busca: "muslo", "muslera", "hasta muslo", "al muslo", "thigh", "TH"
   - Variantes: "media muslo", "med. muslo", "m. muslo", "muslera"

   **Para PANTY (códigos 754xx):**
   - Busca: "panty", "pantimedia", "pantimedias", "completa", "pantyhose", "PT"
   - Variantes: "media panty", "med. panty", "m. panty", "pantalon", "pantys"

   **Para RODILLA (códigos 793xx):**
   - Busca: "rodilla", "hasta rodilla", "a la rodilla", "knee", "KN"
   - Variantes: "media rodilla", "med. rodilla", "m. rodilla", "rodillera"

2. **Identifica la TALLA (CRÍTICO para completar el código):**
   - Busca: "Talla", "T.", "Size", "Tamaño", o simplemente las letras M, L, XL, XXL
   - Puede aparecer como: "M", "L", "XL", "XXL", "Grande", "Mediana", "Extra Grande"
   - Si dice "Grande" → L
   - Si dice "Mediana" o "Media" → M
   - Si dice "Extra Grande" → XL
   - Si dice "Extra Extra Grande" → XXL

3. **Combina tipo + talla para obtener el código:**
   - "Muslo" + "M" → 74113
   - "Muslo" + "L" → 74114
   - "Muslo" + "XL" → 74115
   - "Muslo" + "XXL" → 74116
   - "Panty" + "M" → 75406
   - "Panty" + "L" → 75407
   - "Panty" + "XL" → 75408
   - "Panty" + "XXL" → 75409
   - "Rodilla" + "M" → 79321
   - "Rodilla" + "L" → 79322
   - "Rodilla" + "XL" → 79323

**PRIORIDAD 2: BÚSQUEDA DE CÓDIGO NUMÉRICO (solo si no encuentras el nombre)**

4. **Búsqueda directa de código:** Busca códigos de 5 dígitos que empiecen con 7
   - Pueden aparecer como: "Ref:", "Código:", "Art:", "Artículo:", "Producto:", "SKU:", o solo el número
   - Revisa encabezados, cuerpo, pie de página, márgenes, anotaciones manuscritas

5. **Matching de códigos parciales:**
   - Si ves un número parcial como "741__" → muy probablemente es 74113 o 74114
   - Si ves "754__" → muy probablemente es 75406, 75407, 75408 o 75409
   - Si ves "793__" → muy probablemente es 79321, 79322 o 79323
   - **Usa el contexto de la talla** para desambiguar:
     * Si dice "Talla M" y ves "741" → 74113
     * Si dice "Talla L" y ves "741" → 74114
     * Si dice "Talla M" y ves "754" → 75406
     * Si dice "Talla L" y ves "793" → 79322

6. **Inferencia cuando falta información:**
   - Si encuentras el tipo pero NO la talla:
     * Si dice solo "Muslo" sin talla → probablemente L (74114) - es la más común
     * Si dice solo "Panty" sin talla → probablemente L (75407) - es la más común
     * Si dice solo "Rodilla" sin talla → probablemente L (79322) - es la más común

   - Si encuentras la talla pero el tipo es confuso:
     * Busca pistas adicionales: "compresión", "varicosas", "circulación"
     * Si el precio es ~$130,000 → probablemente rodilla
     * Si el precio es ~$175,000 → probablemente muslo o panty

7. **Casos difíciles - usa razonamiento extremo:**
   - Si ves palabras parciales como "mus_o", "pan_y", "rod_lla" → infiere la palabra completa
   - Si está manuscrito y poco legible, usa el contexto de toda la factura
   - Si dice "media compresión talla grande" sin especificar tipo → probablemente muslo L (74114)
   - **NUNCA devuelvas null si ves CUALQUIER evidencia del tipo de media o talla**
   - **Solo devuelve null si absolutamente no hay NINGUNA información sobre el producto**

**INSTRUCCIONES PARA OTROS CAMPOS (prioridad secundaria):**

7. **Números de factura:** busca "Factura", "Fact.", "No.", "#", "Número", "N°"
8. **Nombres:** busca "Nombre", "Cliente", "Paciente", "Señor(a)" - extrae nombre completo
9. **Cédulas:** busca "Cédula", "CC", "C.C.", "Identificación", "ID" - solo números sin puntos ni comas
10. **Totales:** busca "Total", "Total a Pagar", "Valor Total", "$", "COP" - usa el total final si hay descuentos
11. **Cantidad de pares:** busca "Cantidad", "Cant.", "Pares", "Unidades", "Qty" - suma si hay múltiples líneas
12. Ten en cuenta que la letra puede ser manuscrita, impresa, o mixta

**EJEMPLOS DE EXTRACCIÓN CON PRIORIDAD EN REFERENCIAS (ENFOCADO EN NOMBRES):**

Ejemplo 1 - NOMBRE DEL PRODUCTO (CASO MÁS COMÚN):
- Texto: "Factura 123 | Media MUSLO | Talla: L | Cliente: Maria García | Total: $175.000"
- Razonamiento: "MUSLO" + "L" → código 74114
- Respuesta: {"numero_factura": "123", "referencia_producto": "74114", "nombre_cliente": "Maria García", "cedula_cliente": null, "total": 175000, "cantidad_pares": null}

Ejemplo 2 - NOMBRE CON VARIACIÓN:
- Texto: "No: 456 | Pantimedia M | Ana Martínez | CC: 12345678 | $175,000"
- Razonamiento: "Pantimedia" = PANTY + "M" → código 75406
- Respuesta: {"numero_factura": "456", "referencia_producto": "75406", "nombre_cliente": "Ana Martínez", "cedula_cliente": "12345678", "total": 175000, "cantidad_pares": null}

Ejemplo 3 - NOMBRE MANUSCRITO:
- Texto: "Factura 789 | Media rodilla (manuscrito) | XL | Total: $130,000 | 2 pares"
- Razonamiento: "rodilla" + "XL" → código 79323
- Respuesta: {"numero_factura": "789", "referencia_producto": "79323", "nombre_cliente": null, "cedula_cliente": null, "total": 130000, "cantidad_pares": 2}

Ejemplo 4 - NOMBRE PARCIAL:
- Texto: "Med. mus_o | Talla M | Factura 321 | Pedro López | $175.000"
- Razonamiento: "mus_o" = "muslo" + "M" → código 74113
- Respuesta: {"numero_factura": "321", "referencia_producto": "74113", "nombre_cliente": "Pedro López", "cedula_cliente": null, "total": 175000, "cantidad_pares": null}

Ejemplo 5 - SOLO TIPO SIN TALLA:
- Texto: "Factura 555 | Media PANTY | Total 175k | Juan Pérez"
- Razonamiento: "PANTY" sin talla → inferir L (más común) → código 75407
- Respuesta: {"numero_factura": "555", "referencia_producto": "75407", "nombre_cliente": "Juan Pérez", "cedula_cliente": null, "total": 175000, "cantidad_pares": null}

Ejemplo 6 - TALLA DESCRITA EN PALABRAS:
- Texto: "#888 | Rodilla Grande | Carlos | 130.000"
- Razonamiento: "Rodilla" + "Grande" (= L) → código 79322
- Respuesta: {"numero_factura": "888", "referencia_producto": "79322", "nombre_cliente": "Carlos", "cedula_cliente": null, "total": 130000, "cantidad_pares": null}

Ejemplo 7 - CÓDIGO NUMÉRICO (menos común):
- Texto: "FACTURA: 99 | REF: 74113 | CLIENTE: Maria García | TOTAL: $175.000"
- Razonamiento: código exacto 74113
- Respuesta: {"numero_factura": "99", "referencia_producto": "74113", "nombre_cliente": "Maria García", "cedula_cliente": null, "total": 175000, "cantidad_pares": null}

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
