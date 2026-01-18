-- ============================================
-- POLÍTICAS RLS (Row Level Security) - SAFE VERSION
-- ============================================
-- Este script elimina solo las políticas que va a crear
-- y luego las crea nuevamente

-- ============================================
-- ELIMINAR POLÍTICAS EXISTENTES (SOLO LAS QUE VAMOS A RECREAR)
-- ============================================

-- Políticas de ventas
DROP POLICY IF EXISTS "Vendedores pueden insertar ventas" ON ventas;
DROP POLICY IF EXISTS "Vendedores pueden ver sus ventas" ON ventas;
DROP POLICY IF EXISTS "Admins pueden actualizar ventas" ON ventas;
DROP POLICY IF EXISTS "Admins pueden eliminar ventas" ON ventas;

-- Políticas de productos
DROP POLICY IF EXISTS "Todos pueden ver productos" ON productos;
DROP POLICY IF EXISTS "Admins pueden modificar productos" ON productos;

-- Políticas de caja_efectivo
DROP POLICY IF EXISTS "Todos pueden ver caja" ON caja_efectivo;
DROP POLICY IF EXISTS "Admins pueden modificar caja" ON caja_efectivo;

-- Políticas de usuarios
DROP POLICY IF EXISTS "Usuarios pueden ver su info" ON usuarios;
DROP POLICY IF EXISTS "Admins pueden crear usuarios" ON usuarios;

-- Políticas de movimientos_inventario
DROP POLICY IF EXISTS "Usuarios pueden registrar movimientos" ON movimientos_inventario;
DROP POLICY IF EXISTS "Todos pueden ver movimientos" ON movimientos_inventario;

-- Políticas de devoluciones
DROP POLICY IF EXISTS "Vendedores pueden crear devoluciones" ON devoluciones;
DROP POLICY IF EXISTS "Todos pueden ver devoluciones" ON devoluciones;
DROP POLICY IF EXISTS "Admins pueden actualizar devoluciones" ON devoluciones;

-- Políticas de compras
DROP POLICY IF EXISTS "Admins pueden gestionar compras" ON compras;

-- Políticas de recogidas_efectivo
DROP POLICY IF EXISTS "Admins pueden gestionar recogidas" ON recogidas_efectivo;

-- ============================================
-- CREAR POLÍTICAS NUEVAS
-- ============================================

-- ============================================
-- TABLA: ventas
-- ============================================

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

-- ============================================
-- TABLA: productos
-- ============================================

CREATE POLICY "Todos pueden ver productos"
ON productos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins pueden modificar productos"
ON productos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- TABLA: caja_efectivo
-- ============================================

CREATE POLICY "Todos pueden ver caja"
ON caja_efectivo
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins pueden modificar caja"
ON caja_efectivo
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- TABLA: usuarios
-- ============================================

CREATE POLICY "Usuarios pueden ver su info"
ON usuarios
FOR SELECT
TO authenticated
USING (
  auth_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.auth_id = auth.uid()
    AND u.rol = 'admin'
  )
);

CREATE POLICY "Admins pueden crear usuarios"
ON usuarios
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- TABLA: movimientos_inventario
-- ============================================

CREATE POLICY "Usuarios pueden registrar movimientos"
ON movimientos_inventario
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Todos pueden ver movimientos"
ON movimientos_inventario
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- TABLA: devoluciones
-- ============================================

CREATE POLICY "Vendedores pueden crear devoluciones"
ON devoluciones
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Todos pueden ver devoluciones"
ON devoluciones
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins pueden actualizar devoluciones"
ON devoluciones
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- TABLA: compras
-- ============================================

CREATE POLICY "Admins pueden gestionar compras"
ON compras
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- TABLA: recogidas_efectivo
-- ============================================

CREATE POLICY "Admins pueden gestionar recogidas"
ON recogidas_efectivo
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================

ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_efectivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE devoluciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE recogidas_efectivo ENABLE ROW LEVEL SECURITY;
