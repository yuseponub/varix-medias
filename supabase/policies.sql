-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================
-- Estas políticas permiten a los usuarios interactuar con las tablas
-- según su rol (admin o vendedor)

-- ============================================
-- TABLA: ventas
-- ============================================

-- Política: Los vendedores pueden insertar sus propias ventas
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

-- Política: Los vendedores pueden ver sus propias ventas
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

-- Política: Solo admins pueden actualizar ventas
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

-- Política: Solo admins pueden eliminar ventas
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

-- Política: Todos pueden ver productos
CREATE POLICY "Todos pueden ver productos"
ON productos
FOR SELECT
TO authenticated
USING (true);

-- Política: Solo admins pueden modificar productos
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

-- Política: Todos pueden ver la caja
CREATE POLICY "Todos pueden ver caja"
ON caja_efectivo
FOR SELECT
TO authenticated
USING (true);

-- Política: Solo admins pueden modificar la caja
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

-- Política: Los usuarios pueden ver su propia información
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

-- Política: Solo admins pueden crear usuarios
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

-- Política: Todos pueden insertar movimientos
CREATE POLICY "Usuarios pueden registrar movimientos"
ON movimientos_inventario
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Todos pueden ver movimientos
CREATE POLICY "Todos pueden ver movimientos"
ON movimientos_inventario
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- TABLA: devoluciones
-- ============================================

-- Política: Vendedores pueden crear devoluciones
CREATE POLICY "Vendedores pueden crear devoluciones"
ON devoluciones
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Todos pueden ver devoluciones
CREATE POLICY "Todos pueden ver devoluciones"
ON devoluciones
FOR SELECT
TO authenticated
USING (true);

-- Política: Solo admins pueden actualizar devoluciones
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

-- Política: Solo admins pueden gestionar compras
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

-- Política: Solo admins pueden gestionar recogidas
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
