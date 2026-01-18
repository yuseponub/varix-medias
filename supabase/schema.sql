-- VARIX MEDIAS - Schema SQL para Supabase
-- Ejecutar este archivo en el SQL Editor de Supabase

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: productos (Medias)
-- ============================================
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(10) UNIQUE NOT NULL, -- 74113, 74114, etc
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('muslo', 'panty', 'rodilla')),
  talla VARCHAR(5) NOT NULL CHECK (talla IN ('M', 'L', 'XL', 'XXL')),
  precio_venta DECIMAL(10,2) NOT NULL DEFAULT 175000,
  precio_compra DECIMAL(10,2) NOT NULL DEFAULT 82356,
  stock_normal INTEGER NOT NULL DEFAULT 0,
  stock_devoluciones INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_tipo_talla ON productos(tipo, talla);

-- ============================================
-- TABLA: pacientes
-- ============================================
CREATE TABLE IF NOT EXISTS pacientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_completo VARCHAR(255) NOT NULL,
  cedula VARCHAR(20) UNIQUE,
  telefono VARCHAR(20),
  email VARCHAR(255),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_pacientes_nombre ON pacientes(nombre_completo);
CREATE INDEX idx_pacientes_cedula ON pacientes(cedula);

-- ============================================
-- TABLA: usuarios
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE NOT NULL, -- referencia a auth.users
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'vendedor')),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);

-- ============================================
-- TABLA: ventas (INMUTABLE)
-- ============================================
CREATE TABLE IF NOT EXISTS ventas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  paciente_id UUID REFERENCES pacientes(id),
  paciente_nombre VARCHAR(255) NOT NULL,
  producto_id UUID NOT NULL REFERENCES productos(id),
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')),
  tipo_comprobante VARCHAR(20) CHECK (tipo_comprobante IN ('credibanco', 'redeban', 'nequi', 'bancolombia')),
  num_factura VARCHAR(50) NOT NULL,
  foto_recibo_url TEXT NOT NULL,
  foto_comprobante_url TEXT,
  num_fotos_subidas INTEGER DEFAULT 1,
  vendedor_id UUID NOT NULL REFERENCES usuarios(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_ventas_fecha ON ventas(fecha DESC);
CREATE INDEX idx_ventas_paciente ON ventas(paciente_id);
CREATE INDEX idx_ventas_producto ON ventas(producto_id);
CREATE INDEX idx_ventas_vendedor ON ventas(vendedor_id);
CREATE INDEX idx_ventas_num_factura ON ventas(num_factura);

-- ============================================
-- TABLA: devoluciones
-- ============================================
CREATE TABLE IF NOT EXISTS devoluciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha_devolucion DATE NOT NULL,
  hora TIME NOT NULL,
  venta_original_id UUID NOT NULL REFERENCES ventas(id),
  paciente_id UUID REFERENCES pacientes(id),
  producto_id UUID NOT NULL REFERENCES productos(id),
  motivo TEXT NOT NULL,
  estado_media VARCHAR(30) NOT NULL CHECK (estado_media IN ('empaque_cerrado', 'buen_estado', 'danada')),
  monto_devuelto DECIMAL(10,2) NOT NULL,
  metodo_devolucion VARCHAR(20) NOT NULL CHECK (metodo_devolucion IN ('efectivo', 'transferencia')),
  foto_recibo_firmado_url TEXT NOT NULL,
  foto_media_devuelta_url TEXT NOT NULL,
  procesado_por UUID NOT NULL REFERENCES usuarios(id),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  revisado_por UUID REFERENCES usuarios(id),
  fecha_revision TIMESTAMPTZ,
  observaciones_admin TEXT,
  destino_inventario VARCHAR(20) CHECK (destino_inventario IN ('devoluciones', 'normal', 'descarte')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_devoluciones_fecha ON devoluciones(fecha_devolucion DESC);
CREATE INDEX idx_devoluciones_estado ON devoluciones(estado);
CREATE INDEX idx_devoluciones_venta_original ON devoluciones(venta_original_id);

-- ============================================
-- TABLA: compras
-- ============================================
CREATE TABLE IF NOT EXISTS compras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  proveedor VARCHAR(255) NOT NULL,
  num_factura_proveedor VARCHAR(50),
  subtotal DECIMAL(12,2) NOT NULL,
  iva DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  forma_pago VARCHAR(30) NOT NULL CHECK (forma_pago IN ('efectivo_caja', 'jose_romero', 'otro')),
  foto_factura_url TEXT,
  observaciones TEXT,
  registrado_por UUID NOT NULL REFERENCES usuarios(id),
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'parcial')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_compras_fecha ON compras(fecha DESC);
CREATE INDEX idx_compras_proveedor ON compras(proveedor);
CREATE INDEX idx_compras_estado ON compras(estado);

-- ============================================
-- TABLA: compras_detalle
-- ============================================
CREATE TABLE IF NOT EXISTS compras_detalle (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_compras_detalle_compra ON compras_detalle(compra_id);

-- ============================================
-- TABLA: recogidas_efectivo
-- ============================================
CREATE TABLE IF NOT EXISTS recogidas_efectivo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha_recogida DATE NOT NULL,
  hora TIME NOT NULL,
  periodo_desde DATE NOT NULL,
  periodo_hasta DATE NOT NULL,
  efectivo_sistema DECIMAL(12,2) NOT NULL,
  efectivo_recogido DECIMAL(12,2) NOT NULL,
  diferencia DECIMAL(12,2) GENERATED ALWAYS AS (efectivo_recogido - efectivo_sistema) STORED,
  foto_efectivo_url TEXT,
  observaciones TEXT,
  recogido_por UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_recogidas_fecha ON recogidas_efectivo(fecha_recogida DESC);

-- ============================================
-- TABLA: caja_efectivo (singleton)
-- ============================================
CREATE TABLE IF NOT EXISTS caja_efectivo (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  saldo_actual DECIMAL(12,2) NOT NULL DEFAULT 0,
  ultima_recogida_id UUID REFERENCES recogidas_efectivo(id),
  fecha_ultima_recogida DATE,
  ultima_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar registro inicial
INSERT INTO caja_efectivo (id, saldo_actual) VALUES (1, 0) ON CONFLICT DO NOTHING;

-- ============================================
-- TABLA: movimientos_inventario
-- ============================================
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  producto_id UUID NOT NULL REFERENCES productos(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'devolucion')),
  cantidad INTEGER NOT NULL,
  stock_anterior INTEGER NOT NULL,
  stock_nuevo INTEGER NOT NULL,
  referencia VARCHAR(255) NOT NULL, -- 'venta_id', 'compra_id', etc
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_movimientos_inventario_fecha ON movimientos_inventario(fecha DESC);
CREATE INDEX idx_movimientos_inventario_producto ON movimientos_inventario(producto_id);

-- ============================================
-- TABLA: movimientos_efectivo
-- ============================================
CREATE TABLE IF NOT EXISTS movimientos_efectivo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('venta', 'devolucion', 'compra', 'recogida', 'ajuste')),
  monto DECIMAL(12,2) NOT NULL,
  saldo_anterior DECIMAL(12,2) NOT NULL,
  saldo_nuevo DECIMAL(12,2) NOT NULL,
  referencia_id VARCHAR(255) NOT NULL,
  responsable_id UUID NOT NULL REFERENCES usuarios(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_movimientos_efectivo_fecha ON movimientos_efectivo(fecha DESC);
CREATE INDEX idx_movimientos_efectivo_tipo ON movimientos_efectivo(tipo);

-- ============================================
-- TABLA: cierres_caja
-- ============================================
CREATE TABLE IF NOT EXISTS cierres_caja (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  vendedor_id UUID NOT NULL REFERENCES usuarios(id),
  efectivo_declarado DECIMAL(12,2) NOT NULL,
  efectivo_sistema DECIMAL(12,2) NOT NULL,
  tarjeta_sistema DECIMAL(12,2) NOT NULL,
  transferencias_sistema DECIMAL(12,2) NOT NULL,
  diferencia_efectivo DECIMAL(12,2) GENERATED ALWAYS AS (efectivo_declarado - efectivo_sistema) STORED,
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_cierres_caja_fecha ON cierres_caja(fecha DESC);
CREATE INDEX idx_cierres_caja_vendedor ON cierres_caja(vendedor_id);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas que lo necesitan
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON productos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pacientes_updated_at BEFORE UPDATE ON pacientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_devoluciones_updated_at BEFORE UPDATE ON devoluciones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compras_updated_at BEFORE UPDATE ON compras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cierres_caja_updated_at BEFORE UPDATE ON cierres_caja FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Insertar productos iniciales (11 tipos de medias)
INSERT INTO productos (codigo, tipo, talla, precio_venta, precio_compra, stock_normal, stock_devoluciones) VALUES
  ('74113', 'muslo', 'M', 175000, 82356, 5, 0),
  ('74114', 'muslo', 'L', 175000, 82356, 8, 0),
  ('74115', 'muslo', 'XL', 175000, 82356, 0, 0),
  ('74116', 'muslo', 'XXL', 175000, 82356, 0, 0),
  ('75406', 'panty', 'M', 175000, 103778, 4, 0),
  ('75407', 'panty', 'L', 175000, 103778, 6, 0),
  ('75408', 'panty', 'XL', 175000, 103778, 0, 0),
  ('75409', 'panty', 'XXL', 175000, 103778, 0, 0),
  ('79321', 'rodilla', 'M', 130000, 62322, 0, 0),
  ('79322', 'rodilla', 'L', 130000, 62322, 17, 0),
  ('79323', 'rodilla', 'XL', 130000, 62322, 0, 0)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE devoluciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE recogidas_efectivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_efectivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_efectivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_caja ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (todos pueden leer si están autenticados)
CREATE POLICY "Usuarios autenticados pueden leer productos" ON productos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuarios autenticados pueden leer pacientes" ON pacientes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuarios autenticados pueden leer usuarios" ON usuarios FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuarios autenticados pueden leer ventas" ON ventas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuarios autenticados pueden leer devoluciones" ON devoluciones FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuarios autenticados pueden leer compras" ON compras FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuarios autenticados pueden leer caja_efectivo" ON caja_efectivo FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas de escritura (vendedores pueden insertar ventas, admins pueden todo)
CREATE POLICY "Vendedores pueden crear ventas" ON ventas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Vendedores pueden crear devoluciones" ON devoluciones FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins pueden actualizar devoluciones" ON devoluciones FOR UPDATE USING (auth.role() = 'authenticated');

-- Nota: Las políticas más específicas se configurarán en el código de la aplicación

COMMENT ON TABLE productos IS 'Catálogo de medias de compresión disponibles';
COMMENT ON TABLE ventas IS 'Registro inmutable de todas las ventas realizadas';
COMMENT ON TABLE devoluciones IS 'Devoluciones procesadas por vendedores y aprobadas por admin';
COMMENT ON TABLE recogidas_efectivo IS 'Historial de recogidas de efectivo por el admin';
