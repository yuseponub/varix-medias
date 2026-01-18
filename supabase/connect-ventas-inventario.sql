-- ============================================
-- CONECTAR VENTAS CON INVENTARIO
-- ============================================
-- Este script agrega la funcionalidad para conectar ventas con productos del inventario

-- 1. Agregar columna producto_id a ventas si no existe (referencia a productos)
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS producto_id UUID REFERENCES productos(id);

-- 2. Agregar columna referencia_producto (código del producto ej: 74113)
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS referencia_producto VARCHAR(10);

-- 3. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_ventas_producto_id ON ventas(producto_id);
CREATE INDEX IF NOT EXISTS idx_ventas_referencia ON ventas(referencia_producto);

-- 4. Verificar las columnas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ventas'
ORDER BY ordinal_position;
