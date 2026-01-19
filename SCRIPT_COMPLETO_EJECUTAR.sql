-- ========================================
-- SCRIPT COMPLETO: Preparar y crear sistema de compras
-- ========================================
-- EJECUTA TODO ESTE SCRIPT EN SUPABASE SQL EDITOR

-- PASO 1: Eliminar tablas viejas si existen
DROP TABLE IF EXISTS compras_detalle CASCADE;
DROP TABLE IF EXISTS compras CASCADE;
DROP TABLE IF EXISTS gastos_extra CASCADE;
DROP TABLE IF EXISTS gastos_hormigas CASCADE;

-- PASO 2: Crear tabla de compras
CREATE TABLE compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  proveedor VARCHAR(255) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  documento_url TEXT,
  documento_nombre TEXT,
  estado VARCHAR(20) DEFAULT 'por_recibir',
  observaciones TEXT,
  registrado_por UUID REFERENCES auth.users(id),
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 3: Crear tabla de detalle de compras
CREATE TABLE compras_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID REFERENCES compras(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  cantidad_pares INTEGER NOT NULL,
  precio_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 4: Crear tabla de gastos extra
CREATE TABLE gastos_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  concepto TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL,
  categoria VARCHAR(100),
  observaciones TEXT,
  documento_url TEXT,
  documento_nombre TEXT,
  estado VARCHAR(20) DEFAULT 'pendiente',
  registrado_por UUID REFERENCES auth.users(id),
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 5: Crear índices para búsquedas rápidas
CREATE INDEX idx_compras_fecha ON compras(fecha);
CREATE INDEX idx_compras_estado ON compras(estado);
CREATE INDEX idx_compras_detalle_compra ON compras_detalle(compra_id);
CREATE INDEX idx_gastos_extra_fecha ON gastos_extra(fecha);
CREATE INDEX idx_gastos_extra_estado ON gastos_extra(estado);

-- PASO 6: Habilitar RLS
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_extra ENABLE ROW LEVEL SECURITY;

-- PASO 7: Políticas para compras
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver compras" ON compras;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear compras" ON compras;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar compras" ON compras;

CREATE POLICY "Usuarios autenticados pueden ver compras"
  ON compras FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear compras"
  ON compras FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar compras"
  ON compras FOR UPDATE
  TO authenticated
  USING (true);

-- PASO 8: Políticas para compras_detalle
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver detalle compras" ON compras_detalle;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear detalle compras" ON compras_detalle;

CREATE POLICY "Usuarios autenticados pueden ver detalle compras"
  ON compras_detalle FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear detalle compras"
  ON compras_detalle FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- PASO 9: Políticas para gastos_extra
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver gastos" ON gastos_extra;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear gastos" ON gastos_extra;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar gastos" ON gastos_extra;

CREATE POLICY "Usuarios autenticados pueden ver gastos"
  ON gastos_extra FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear gastos"
  ON gastos_extra FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar gastos"
  ON gastos_extra FOR UPDATE
  TO authenticated
  USING (true);

-- PASO 10: Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- PASO 11: Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS update_compras_updated_at ON compras;
DROP TRIGGER IF EXISTS update_gastos_extra_updated_at ON gastos_extra;

CREATE TRIGGER update_compras_updated_at BEFORE UPDATE ON compras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gastos_extra_updated_at BEFORE UPDATE ON gastos_extra
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PASO 12: Verificar que las tablas se crearon correctamente
SELECT 'Compras creada:', COUNT(*) FROM compras;
SELECT 'Compras Detalle creada:', COUNT(*) FROM compras_detalle;
SELECT 'Gastos Extra creada:', COUNT(*) FROM gastos_extra;

-- PASO 13: Mostrar estructura de las tablas
SELECT 'Estructura de compras:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'compras'
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Estructura de compras_detalle:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'compras_detalle'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ¡Listo! Ahora el sistema de compras está preparado
