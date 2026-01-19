-- Crear tabla para registrar los cierres de caja diarios
CREATE TABLE IF NOT EXISTS cierres_diarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  cerrado_por UUID REFERENCES auth.users(id),
  fecha_hora_cierre TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_efectivo NUMERIC(10,2),
  total_tarjeta NUMERIC(10,2),
  total_transferencia NUMERIC(10,2),
  total_ventas NUMERIC(10,2),
  cantidad_ventas INTEGER,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas por fecha
CREATE INDEX IF NOT EXISTS idx_cierres_fecha ON cierres_diarios(fecha);

-- Habilitar RLS
ALTER TABLE cierres_diarios ENABLE ROW LEVEL SECURITY;

-- Política para que todos los usuarios autenticados puedan ver cierres
CREATE POLICY "Usuarios autenticados pueden ver cierres"
  ON cierres_diarios FOR SELECT
  TO authenticated
  USING (true);

-- Política para que solo admins puedan crear cierres
CREATE POLICY "Solo admins pueden crear cierres"
  ON cierres_diarios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

-- Verificar que la tabla se creó correctamente
SELECT * FROM cierres_diarios LIMIT 1;
