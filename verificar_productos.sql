-- ========================================
-- SCRIPT: Verificar y arreglar tabla productos
-- ========================================

-- 1. Verificar que la tabla productos existe
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'productos'
) AS tabla_productos_existe;

-- 2. Ver la estructura de la tabla productos
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'productos'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Contar cuántos productos hay
SELECT COUNT(*) as total_productos FROM productos;

-- 4. Ver algunos productos de ejemplo
SELECT id, nombre, talla, color, stock_normal, precio_venta
FROM productos
LIMIT 5;

-- 5. Verificar políticas RLS de la tabla productos
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

-- 6. Si RLS está bloqueando, agregar política de lectura pública
DROP POLICY IF EXISTS "productos_select_public" ON productos;

CREATE POLICY "productos_select_public"
  ON productos FOR SELECT
  TO public
  USING (true);

-- 7. Verificar de nuevo
SELECT COUNT(*) as productos_despues FROM productos;
