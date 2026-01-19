-- ========================================
-- CREAR TABLA: cierres_diarios
-- ========================================
-- Ejecuta este script en Supabase SQL Editor

-- Eliminar tabla si existe (opcional, solo si quieres empezar de cero)
DROP TABLE IF EXISTS cierres_diarios CASCADE;

-- Crear tabla de cierres diarios
CREATE TABLE cierres_diarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  cerrado_por UUID REFERENCES usuarios(id),
  total_efectivo NUMERIC(10,2) DEFAULT 0,
  total_tarjeta NUMERIC(10,2) DEFAULT 0,
  total_transferencia NUMERIC(10,2) DEFAULT 0,
  total_ventas NUMERIC(10,2) DEFAULT 0,
  cantidad_ventas INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas por fecha
CREATE INDEX idx_cierres_diarios_fecha ON cierres_diarios(fecha);

-- Habilitar RLS
ALTER TABLE cierres_diarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver cierres" ON cierres_diarios;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear cierres" ON cierres_diarios;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar cierres" ON cierres_diarios;

CREATE POLICY "Usuarios autenticados pueden ver cierres"
  ON cierres_diarios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear cierres"
  ON cierres_diarios FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar cierres"
  ON cierres_diarios FOR UPDATE
  TO authenticated
  USING (true);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_cierres_diarios_updated_at
  BEFORE UPDATE ON cierres_diarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verificar que la tabla se creó correctamente
SELECT 'Tabla cierres_diarios creada exitosamente' as mensaje;
SELECT COUNT(*) as total_registros FROM cierres_diarios;
