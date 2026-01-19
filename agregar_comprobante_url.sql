-- ========================================
-- AGREGAR COLUMNAS FALTANTES: ventas
-- ========================================
-- Ejecuta este script en Supabase SQL Editor

-- Agregar columna para el comprobante de pago digital
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS comprobante_url TEXT;

-- Agregar columnas para la referencia del producto y relación con productos
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS referencia_producto TEXT;

ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS producto_id UUID REFERENCES productos(id);

-- Verificar que las columnas se agregaron correctamente
SELECT 'Columnas agregadas exitosamente a la tabla ventas' as mensaje;

-- Mostrar estructura actualizada de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ventas'
AND table_schema = 'public'
ORDER BY ordinal_position;
