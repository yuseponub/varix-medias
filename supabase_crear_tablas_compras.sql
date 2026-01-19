-- Tabla para registrar compras/pedidos
CREATE TABLE IF NOT EXISTS compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  proveedor VARCHAR(255) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  documento_url TEXT, -- URL del PDF/imagen en Supabase Storage
  documento_nombre TEXT,
  estado VARCHAR(20) DEFAULT 'por_recibir', -- 'por_recibir', 'recibido'
  observaciones TEXT,
  registrado_por UUID REFERENCES auth.users(id),
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de detalle de productos en cada compra
CREATE TABLE IF NOT EXISTS compras_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID REFERENCES compras(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  cantidad_pares INTEGER NOT NULL,
  precio_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para gastos hormigas
CREATE TABLE IF NOT EXISTS gastos_hormigas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  concepto TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL,
  categoria VARCHAR(100), -- 'facturas', 'cajas', 'comisiones', 'otros'
  observaciones TEXT,
  documento_url TEXT,
  documento_nombre TEXT,
  estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'aprobado'
  registrado_por UUID REFERENCES auth.users(id),
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras(fecha);
CREATE INDEX IF NOT EXISTS idx_compras_estado ON compras(estado);
CREATE INDEX IF NOT EXISTS idx_compras_detalle_compra ON compras_detalle(compra_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos_hormigas(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_estado ON gastos_hormigas(estado);

-- Habilitar RLS
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_hormigas ENABLE ROW LEVEL SECURITY;

-- Políticas para compras
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

-- Políticas para compras_detalle
CREATE POLICY "Usuarios autenticados pueden ver detalle compras"
  ON compras_detalle FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear detalle compras"
  ON compras_detalle FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Políticas para gastos_hormigas
CREATE POLICY "Usuarios autenticados pueden ver gastos"
  ON gastos_hormigas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear gastos"
  ON gastos_hormigas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar gastos"
  ON gastos_hormigas FOR UPDATE
  TO authenticated
  USING (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_compras_updated_at BEFORE UPDATE ON compras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gastos_updated_at BEFORE UPDATE ON gastos_hormigas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verificar que las tablas se crearon correctamente
SELECT 'Compras:', COUNT(*) FROM compras;
SELECT 'Compras Detalle:', COUNT(*) FROM compras_detalle;
SELECT 'Gastos Hormigas:', COUNT(*) FROM gastos_hormigas;
