-- Tabla para verificaciones de tarjeta
CREATE TABLE IF NOT EXISTS verificaciones_tarjeta (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha_verificacion DATE NOT NULL,
  hora TIME NOT NULL,
  periodo_desde DATE NOT NULL,
  periodo_hasta DATE NOT NULL,
  monto_acumulado DECIMAL(10, 2) NOT NULL DEFAULT 0,
  observaciones TEXT,
  verificado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para verificaciones de transferencia
CREATE TABLE IF NOT EXISTS verificaciones_transferencia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha_verificacion DATE NOT NULL,
  hora TIME NOT NULL,
  periodo_desde DATE NOT NULL,
  periodo_hasta DATE NOT NULL,
  monto_acumulado DECIMAL(10, 2) NOT NULL DEFAULT 0,
  observaciones TEXT,
  verificado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_verificaciones_tarjeta_fecha ON verificaciones_tarjeta(fecha_verificacion DESC);
CREATE INDEX IF NOT EXISTS idx_verificaciones_transferencia_fecha ON verificaciones_transferencia(fecha_verificacion DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE verificaciones_tarjeta ENABLE ROW LEVEL SECURITY;
ALTER TABLE verificaciones_transferencia ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (permitir a usuarios autenticados)
CREATE POLICY "Usuarios autenticados pueden ver verificaciones tarjeta"
  ON verificaciones_tarjeta FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar verificaciones tarjeta"
  ON verificaciones_tarjeta FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden ver verificaciones transferencia"
  ON verificaciones_transferencia FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar verificaciones transferencia"
  ON verificaciones_transferencia FOR INSERT
  TO authenticated
  WITH CHECK (true);
