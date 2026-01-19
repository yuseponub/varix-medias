-- ========================================
-- CREAR TABLA: devoluciones
-- ========================================
-- Ejecuta este script en Supabase SQL Editor

-- Eliminar tabla si existe (opcional)
DROP TABLE IF EXISTS devoluciones CASCADE;

-- Crear tabla de devoluciones
CREATE TABLE devoluciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,

  -- Información de la venta original (si existe en el sistema)
  venta_id UUID REFERENCES ventas(id),
  numero_factura_original TEXT,

  -- Información del producto devuelto
  producto_id UUID REFERENCES productos(id),
  referencia_producto TEXT NOT NULL,
  cantidad_pares INTEGER NOT NULL,

  -- Información del cliente
  nombre_cliente TEXT,
  cedula_cliente TEXT,

  -- Motivo y detalles
  motivo TEXT NOT NULL,
  observaciones TEXT,

  -- Monto de la devolución
  monto_devuelto NUMERIC(10,2) NOT NULL,

  -- Documentos adjuntos
  foto_nota_devolucion_url TEXT,  -- Foto de la nota de devolución
  foto_factura_original_url TEXT, -- Foto de la factura original (si no está en el sistema)

  -- Usuario que registró la devolución
  registrado_por UUID REFERENCES usuarios(id),

  -- Estado de la devolución
  estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, aprobada, rechazada
  aprobado_por UUID REFERENCES usuarios(id),
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX idx_devoluciones_fecha ON devoluciones(fecha DESC);
CREATE INDEX idx_devoluciones_venta_id ON devoluciones(venta_id);
CREATE INDEX idx_devoluciones_estado ON devoluciones(estado);
CREATE INDEX idx_devoluciones_numero_factura ON devoluciones(numero_factura_original);

-- Habilitar RLS
ALTER TABLE devoluciones ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver devoluciones" ON devoluciones;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear devoluciones" ON devoluciones;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar devoluciones" ON devoluciones;

CREATE POLICY "Usuarios autenticados pueden ver devoluciones"
  ON devoluciones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear devoluciones"
  ON devoluciones FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar devoluciones"
  ON devoluciones FOR UPDATE
  TO authenticated
  USING (true);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_devoluciones_updated_at
  BEFORE UPDATE ON devoluciones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verificar que la tabla se creó correctamente
SELECT 'Tabla devoluciones creada exitosamente' as mensaje;

-- Mostrar estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'devoluciones'
AND table_schema = 'public'
ORDER BY ordinal_position;
