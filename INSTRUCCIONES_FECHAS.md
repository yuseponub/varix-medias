# Instrucciones para Corregir Fechas de Ventas

## Problema Identificado

Las ventas se están registrando con la fecha incorrecta debido a que el sistema usa `new Date().toISOString()` que devuelve la hora en UTC, no en la zona horaria local de Colombia (UTC-5).

Por ejemplo, si son las 11:00 PM del 18 de enero en Colombia, UTC ya está en el 19 de enero, causando que la fecha se registre incorrectamente.

## Solución Implementada

1. **Creado archivo `lib/utils/dates.ts`** con funciones para manejar fechas en zona horaria de Colombia:
   - `getFechaActual()`: Devuelve la fecha actual en formato YYYY-MM-DD (Colombia UTC-5)
   - `getHoraActual()`: Devuelve la hora actual en formato HH:MM:SS (Colombia UTC-5)

2. **Script SQL para corregir ventas existentes:**
   - Archivo: `supabase_corregir_fechas_ventas.sql`
   - Ejecutar en Supabase SQL Editor para cambiar las 3 ventas del 17 al 18 de enero

## Pasos para Corregir las Fechas Existentes

### 1. Ejecutar el Script SQL en Supabase

1. Ve a tu proyecto en Supabase (https://supabase.com)
2. Abre el **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido del archivo `supabase_corregir_fechas_ventas.sql`:

```sql
-- Actualizar las ventas que tienen fecha '2025-01-17' a '2025-01-18'
UPDATE ventas
SET fecha = '2025-01-18'
WHERE fecha = '2025-01-17';

-- Verificar las ventas actualizadas
SELECT id, fecha, hora, total, metodo_pago, nombre_cliente
FROM ventas
ORDER BY fecha DESC, hora DESC
LIMIT 10;
```

5. Ejecuta la query (botón Run o Ctrl/Cmd + Enter)
6. Verifica que las fechas se hayan actualizado correctamente

### 2. Actualizar el Código para Usar las Nuevas Funciones de Fecha

Los siguientes archivos necesitan ser actualizados para usar las nuevas funciones de fecha:

#### Archivos a actualizar:
- `app/admin/registrar-venta/page.tsx` (líneas 242-243)
- `app/vendedor/vender/page.tsx` (líneas 233-234)
- `app/admin/inventario/page.tsx` (líneas 118, 162)

#### Cambio necesario:

**ANTES:**
```typescript
const now = new Date()
const fecha = now.toISOString().split('T')[0]
const hora = now.toTimeString().split(' ')[0]
```

**DESPUÉS:**
```typescript
import { getFechaActual, getHoraActual } from '@/lib/utils/dates'

const fecha = getFechaActual()
const hora = getHoraActual()
```

## Uso del Botón "Cerrar Día"

En la página de **Cierre de Caja** (`/admin/cierre-caja`):

1. El botón **"🔒 Cerrar Día de Hoy"** solo aparece cuando estás viendo el día actual
2. Al hacer clic:
   - Te pedirá confirmación
   - Marcará el día como cerrado
   - Permitirá registrar ventas para el día siguiente

## Próximos Pasos

1. ✅ Ejecutar el script SQL para corregir las 3 ventas existentes
2. ⏳ Actualizar los archivos de código para usar `getFechaActual()` y `getHoraActual()`
3. ⏳ Hacer commit y push de los cambios
4. ⏳ Verificar en producción que las nuevas ventas se registren con la fecha correcta
