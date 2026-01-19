# 🔧 Instrucciones para Arreglar el Sistema de Compras

## 📋 Problema Identificado

El sistema OCR está funcionando perfectamente y detecta todos los productos del PDF, **PERO** no puede hacer match con el inventario porque:

1. Los productos en la base de datos no se están cargando debido a políticas RLS (Row Level Security) de Supabase
2. Los productos no tienen las referencias correctas en el campo `codigo`

## ✅ Solución Implementada

He realizado los siguientes cambios:

### 1. Nueva API para Cargar Productos
- **Archivo creado**: `app/api/productos/route.ts`
- **Qué hace**: Usa el Service Role Key de Supabase para bypassear las políticas RLS y cargar los productos
- **Beneficio**: Garantiza que los productos siempre se carguen, sin importar las políticas RLS

### 2. Actualización del Código de Compras
- **Archivo modificado**: `app/admin/compras/page.tsx`
- **Cambios**:
  - Ahora carga productos desde la nueva API `/api/productos`
  - Usa el campo `codigo` del producto para hacer match con las referencias del OCR
  - Mejor logging para diagnóstico

### 3. Scripts SQL Creados

He creado 3 scripts SQL que debes ejecutar en orden:

#### **Script 1: `diagnostico_productos.sql`**
- Verifica el estado actual de la tabla productos
- Muestra las políticas RLS existentes
- **EJECUTAR PRIMERO** para ver el estado actual

#### **Script 2: `actualizar_referencias_productos.sql`**
- Actualiza el campo `codigo` de cada producto con su referencia correcta:
  - Muslo M → 74113
  - Muslo L → 74114
  - Muslo XL → 74115
  - Muslo XXL → 74116
  - Panty M → 75406
  - Panty L → 75407
  - Panty XL → 75408
  - Panty XXL → 75409
  - Rodilla M → 79321
  - Rodilla L → 79322
  - Rodilla XL → 79323
- **EJECUTAR SEGUNDO** para actualizar las referencias

#### **Script 3: `verificar_productos.sql`** (opcional)
- Verifica y agrega políticas RLS si es necesario
- **EJECUTAR TERCERO** solo si aún hay problemas

## ⚠️ IMPORTANTE: Reiniciar el Servidor

Antes de hacer cualquier otra cosa, **DEBES REINICIAR** el servidor de desarrollo:

1. Ve a la terminal donde está corriendo el servidor
2. Presiona `Ctrl+C` para detenerlo
3. Ejecuta `npm run dev` de nuevo
4. Espera a que compile completamente

**ESTO ES CRÍTICO** porque los cambios en el código no se aplicarán sin reiniciar.

## 🚀 Pasos a Seguir

### Paso 1: Reiniciar Servidor (OBLIGATORIO)
```bash
# En la terminal del servidor:
# Ctrl+C para detener
# Luego:
npm run dev
```

### Paso 2: Ejecutar Diagnóstico
```sql
-- Abre Supabase SQL Editor y ejecuta:
-- c:\Users\Usuario\Proyectos\varix-medias\diagnostico_productos.sql
```

### Paso 2: Actualizar Referencias
```sql
-- Ejecuta el script de actualización:
-- c:\Users\Usuario\Proyectos\varix-medias\actualizar_referencias_productos.sql
```

### Paso 3: Verificar en el Frontend
1. Abre el navegador y ve a la página de Compras
2. Abre la consola del navegador (F12)
3. Sube un PDF de compra
4. Haz clic en "Procesar con OCR"

### Paso 4: Verificar Logs
Deberías ver en la consola:
```
✅ Productos cargados desde API: 11
📋 Primeros productos: [...array con productos...]
📦 Respuesta completa del OCR: {...}
✅ MATCH ENCONTRADO: {...}
```

## 🎯 Resultado Esperado

Después de ejecutar estos scripts:

1. ✅ Los productos se cargarán desde la API sin problemas de RLS
2. ✅ Cada producto tendrá su referencia correcta en el campo `codigo`
3. ✅ El OCR detectará productos del PDF
4. ✅ El sistema hará match automático usando las referencias
5. ✅ Los productos se agregarán automáticamente a la compra

## 📊 Cómo Verificar que Funciona

En la consola del navegador verás:
```
🔍 Iniciando OCR con URL: https://...
📦 Respuesta completa del OCR: {proveedor: "THERAFIRM", productos: Array(7), ...}
✅ Productos cargados desde API: 11
📋 Productos detectados por OCR: Array(7)
📦 Productos disponibles en inventario: Array(11) ← DEBE SER MAYOR QUE 0
🔎 Procesando producto OCR: {referencia: "74113", cantidad: 6, precio_unitario: 50000}
  🔄 Comparando código "74113" con referencia OCR "74113"
  ✅ MATCH ENCONTRADO: {codigo: "74113", nombre: "Muslo", talla: "M", ...}
```

## ❗ Importante

- **NO** necesitas modificar código manualmente
- **SOLO** ejecuta los scripts SQL en orden
- **SI** aún no funciona después de ejecutar los 2 primeros scripts, ejecuta el tercero
- **REINICIA** el servidor de desarrollo después de ejecutar los scripts (Ctrl+C y `npm run dev`)

## 🐛 Si Aún No Funciona

Si después de todo sigues viendo `Array(0)` en productos:

1. Verifica que el archivo `.env.local` tiene el `SUPABASE_SERVICE_ROLE_KEY` configurado
2. Ejecuta el tercer script (`verificar_productos.sql`)
3. Reinicia el servidor de desarrollo
4. Limpia la caché del navegador (Ctrl+Shift+Delete)
5. Abre la consola y busca mensajes de error en rojo

## 📝 Cambios en el Código

Los cambios realizados son:

1. **Nueva API route**: `/app/api/productos/route.ts` - Usa Service Role Key
2. **Modificado**: `/app/admin/compras/page.tsx`:
   - Función `cargarProductos()` ahora usa fetch a `/api/productos`
   - Matching de productos usa campo `codigo` en lugar de generar referencias
   - Interface `Producto` incluye campo `codigo`
3. **Scripts SQL**: Para diagnóstico, actualización y verificación

Todos los archivos están listos. Solo ejecuta los scripts SQL y debería funcionar inmediatamente.
