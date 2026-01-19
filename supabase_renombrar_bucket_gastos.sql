-- Renombrar bucket de gastos-documentos a gastos-extra-documentos
UPDATE storage.buckets
SET id = 'gastos-extra-documentos', name = 'gastos-extra-documentos'
WHERE id = 'gastos-documentos';

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir a gastos-documentos" ON storage.objects;
DROP POLICY IF EXISTS "Todos pueden ver archivos de gastos-documentos" ON storage.objects;

-- Crear nuevas políticas para el bucket renombrado
CREATE POLICY "Usuarios autenticados pueden subir a gastos-extra-documentos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gastos-extra-documentos');

CREATE POLICY "Todos pueden ver archivos de gastos-extra-documentos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'gastos-extra-documentos');

-- Verificar el cambio
SELECT * FROM storage.buckets WHERE name = 'gastos-extra-documentos';
