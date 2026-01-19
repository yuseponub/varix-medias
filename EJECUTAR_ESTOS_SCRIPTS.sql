-- ========================================
-- SCRIPT 1: Crear/Verificar Buckets de Storage
-- ========================================

-- Crear buckets si no existen
INSERT INTO storage.buckets (id, name, public)
VALUES ('compras-documentos', 'compras-documentos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('gastos-extra-documentos', 'gastos-extra-documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "auth_upload_compras" ON storage.objects;
DROP POLICY IF EXISTS "public_read_compras" ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_gastos" ON storage.objects;
DROP POLICY IF EXISTS "public_read_gastos" ON storage.objects;

-- Crear políticas para compras-documentos
CREATE POLICY "auth_upload_compras"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'compras-documentos');

CREATE POLICY "public_read_compras"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'compras-documentos');

-- Crear políticas para gastos-extra-documentos
CREATE POLICY "auth_upload_gastos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gastos-extra-documentos');

CREATE POLICY "public_read_gastos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'gastos-extra-documentos');

-- Verificar buckets creados
SELECT id, name, public FROM storage.buckets
WHERE name IN ('compras-documentos', 'gastos-extra-documentos');
