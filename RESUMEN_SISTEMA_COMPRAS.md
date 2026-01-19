# Sistema de Compras - Resumen Completo

## ✅ Lo que YA está implementado:

### 1. Tablas en Base de Datos
- ✅ `compras` - Registra las compras
- ✅ `compras_detalle` - Detalle de productos por compra
- ✅ `gastos_extra` - Gastos pequeños

### 2. Buckets de Storage
- ✅ `compras-documentos` - Para PDFs/imágenes de facturas de compras
- ✅ `gastos-extra-documentos` - Para documentos de gastos extra

### 3. Páginas Creadas
- ✅ [/admin/compras](app/admin/compras/page.tsx) - Registrar compras con OCR
- ✅ [/admin/por-recibir](app/admin/por-recibir/page.tsx) - Aprobar llegadas (actualiza inventario)
- ✅ [/admin/gastos-extra](app/admin/gastos-extra/page.tsx) - Gastos pequeños manuales

### 4. API OCR
- ✅ [/api/ocr-compras](app/api/ocr-compras/route.ts) - Extrae datos de facturas de compras

## 📋 Scripts SQL que DEBES ejecutar en Supabase:

**IMPORTANTE:** Ejecuta el archivo [EJECUTAR_ESTOS_SCRIPTS.sql](EJECUTAR_ESTOS_SCRIPTS.sql) en Supabase SQL Editor.

Este script incluye:
- ✅ Creación de buckets de storage (compras-documentos, gastos-extra-documentos)
- ✅ Políticas de acceso a storage
- ✅ Verificación de buckets creados

**Si aún no has creado las tablas**, también ejecuta [supabase_crear_tablas_compras.sql](supabase_crear_tablas_compras.sql) que incluye:
- ✅ Tabla `compras` con todos sus campos
- ✅ Tabla `compras_detalle` para el detalle de productos
- ✅ Tabla `gastos_extra` para gastos pequeños
- ✅ Índices y políticas de seguridad (RLS)

## 🎯 Cómo usar el sistema:

### Registrar Compra:
1. Ve a `/admin/compras`
2. Sube el PDF de la factura
3. Haz clic en "🤖 Extraer Datos con OCR"
4. Verifica los productos detectados (o agrégalos manualmente)
5. Registra la compra

### Aprobar Llegada:
1. Ve a `/admin/por-recibir`
2. Haz clic en "Aprobar Llegada"
3. El inventario se actualiza automáticamente

### Registrar Gasto Extra:
1. Ve a `/admin/gastos-extra`
2. Llena el formulario (solo concepto y monto son obligatorios)
3. Registra el gasto
4. Alguien debe aprobarlo para que descuente del efectivo

## 🔧 Si el OCR no funciona:

El OCR está optimizado para detectar productos específicos de medias (Muslo/Panty/Rodilla).

### Debugging OCR:
1. Abre la consola del navegador (F12)
2. Sube el PDF y haz clic en "🤖 Extraer Datos con OCR"
3. Revisa los logs en la consola:
   - 🔍 URL del archivo subido
   - 📦 Respuesta completa del OCR
   - 📋 Productos detectados por el OCR
   - 🔄 Comparaciones de referencias
   - ✅ Matches encontrados o ⚠️ errores

### Si no detecta productos:
1. **Revisa la consola**: Verifica qué referencias devolvió el OCR
2. **Agrega manualmente**: Usa el selector de productos para agregar productos manualmente
3. **Modifica el prompt**: Si necesitas otro formato, edita [/api/ocr-compras/route.ts](app/api/ocr-compras/route.ts) línea 51-106

## 🔑 Configuración requerida:

Para que el OCR funcione, debes tener configurada la variable de entorno:
```
ANTHROPIC_API_KEY=tu_clave_aquí
```

Si no está configurada, el OCR se deshabilitará y deberás agregar productos manualmente.
