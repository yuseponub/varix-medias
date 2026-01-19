-- ========================================
-- DIAGNÓSTICO COMPLETO: Tabla productos
-- ========================================

-- 1. ¿Existe la tabla productos?
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'productos'
) AS tabla_existe;

-- 2. ¿Cuántos productos hay?
SELECT COUNT(*) as total_productos FROM productos;

-- 3. Ver estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'productos'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Ver algunos productos de ejemplo (sin WHERE)
SELECT id, nombre, talla, color, stock_normal, precio_venta
FROM productos
LIMIT 10;

-- 5. Ver TODAS las políticas RLS en productos
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'productos';

-- 6. ¿Está habilitado RLS en la tabla?
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'productos';

-- 7. SOLUCIÓN 1: Deshabilitar RLS completamente (más simple)
-- Descomenta esto si quieres desactivar RLS:
-- ALTER TABLE productos DISABLE ROW LEVEL SECURITY;

-- 8. SOLUCIÓN 2: Agregar política de lectura pública (más seguro)
-- Primero eliminar cualquier política existente con ese nombre
DROP POLICY IF EXISTS "productos_select_public" ON productos;

-- Crear la política que permite SELECT a todos
CREATE POLICY "productos_select_public"
  ON productos FOR SELECT
  TO public
  USING (true);

-- 9. SOLUCIÓN 3: Agregar política para usuarios autenticados
DROP POLICY IF EXISTS "productos_select_authenticated" ON productos;

CREATE POLICY "productos_select_authenticated"
  ON productos FOR SELECT
  TO authenticated
  USING (true);

-- 10. Verificar que las políticas se crearon correctamente
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'productos';

-- 11. Probar el query que usa el frontend
SELECT * FROM productos ORDER BY nombre ASC LIMIT 5;

-- 12. Ver información de autenticación actual
SELECT current_user, session_user;
