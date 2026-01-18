-- ============================================
-- RECONSTRUIR TABLA VENTAS
-- ============================================
-- Este script elimina la tabla ventas vieja y crea una nueva
-- con las columnas correctas que usa el código actual

-- ADVERTENCIA: Esto eliminará todos los datos de ventas existentes
-- Si tienes datos importantes, haz un backup primero

-- 1. Eliminar tabla existente
DROP TABLE IF EXISTS ventas CASCADE;

-- 2. Crear tabla nueva con las columnas correctas
CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Información básica de la venta
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIME NOT NULL DEFAULT CURRENT_TIME,

  -- Información del cliente (extraída de OCR)
  numero_factura TEXT,
  nombre_cliente TEXT,
  cedula_cliente TEXT,

  -- Detalles de la venta
  total DECIMAL(10,2) NOT NULL,
  cantidad_pares INTEGER NOT NULL,
  metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('efectivo', 'digital')),

  -- Archivos adjuntos
  factura_url TEXT,

  -- Información del vendedor
  vendedor_id UUID NOT NULL REFERENCES usuarios(id),

  -- Estado y observaciones
  verificada BOOLEAN DEFAULT FALSE,
  observaciones TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear índices
CREATE INDEX idx_ventas_fecha ON ventas(fecha DESC);
CREATE INDEX idx_ventas_vendedor ON ventas(vendedor_id);
CREATE INDEX idx_ventas_verificada ON ventas(verificada);
CREATE INDEX idx_ventas_numero_factura ON ventas(numero_factura);

-- 4. Habilitar RLS
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS (ya existen pero por si acaso)
DROP POLICY IF EXISTS "Vendedores pueden insertar ventas" ON ventas;
DROP POLICY IF EXISTS "Vendedores pueden ver sus ventas" ON ventas;
DROP POLICY IF EXISTS "Admins pueden actualizar ventas" ON ventas;
DROP POLICY IF EXISTS "Admins pueden eliminar ventas" ON ventas;

CREATE POLICY "Vendedores pueden insertar ventas"
ON ventas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = ventas.vendedor_id
    AND usuarios.auth_id = auth.uid()
  )
);

CREATE POLICY "Vendedores pueden ver sus ventas"
ON ventas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = ventas.vendedor_id
    AND usuarios.auth_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

CREATE POLICY "Admins pueden actualizar ventas"
ON ventas
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

CREATE POLICY "Admins pueden eliminar ventas"
ON ventas
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- 6. Verificar estructura
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'ventas'
ORDER BY ordinal_position;
