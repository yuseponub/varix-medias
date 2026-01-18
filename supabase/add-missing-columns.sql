-- ============================================
-- Agregar columnas faltantes a tabla ventas
-- ============================================

-- Agregar columna numero_factura si no existe
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS numero_factura TEXT;

-- Agregar columna nombre_cliente si no existe
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS nombre_cliente TEXT;

-- Agregar columna cedula_cliente si no existe
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS cedula_cliente TEXT;

-- Agregar columna cantidad_pares si no existe
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS cantidad_pares INTEGER;

-- Agregar columna factura_url si no existe
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS factura_url TEXT;

-- Agregar columna verificada si no existe
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS verificada BOOLEAN DEFAULT FALSE;

-- Verificar las columnas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ventas'
ORDER BY ordinal_position;
