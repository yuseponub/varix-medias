-- ============================================
-- POLÍTICAS DE STORAGE (Buckets)
-- ============================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir facturas" ON storage.objects;
DROP POLICY IF EXISTS "Todos pueden ver facturas" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus facturas" ON storage.objects;

-- ============================================
-- BUCKET: facturas
-- ============================================

-- Política: Usuarios autenticados pueden subir facturas
CREATE POLICY "Usuarios autenticados pueden subir facturas"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'facturas'
);

-- Política: Todos pueden ver/descargar facturas (son públicas)
CREATE POLICY "Todos pueden ver facturas"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'facturas'
);

-- Política: Usuarios pueden actualizar/eliminar archivos
CREATE POLICY "Usuarios pueden actualizar facturas"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'facturas'
);

CREATE POLICY "Usuarios pueden eliminar facturas"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'facturas'
);
