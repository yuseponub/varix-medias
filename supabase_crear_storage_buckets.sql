-- Crear bucket para documentos de compras
INSERT INTO storage.buckets (id, name, public)
VALUES ('compras-documentos', 'compras-documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Crear bucket para documentos de gastos hormigas
INSERT INTO storage.buckets (id, name, public)
VALUES ('gastos-documentos', 'gastos-documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir subir archivos a compras-documentos (usuarios autenticados)
CREATE POLICY "Usuarios autenticados pueden subir a compras-documentos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'compras-documentos');

-- Política para permitir leer archivos de compras-documentos (público)
CREATE POLICY "Todos pueden ver archivos de compras-documentos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'compras-documentos');

-- Política para permitir subir archivos a gastos-documentos (usuarios autenticados)
CREATE POLICY "Usuarios autenticados pueden subir a gastos-documentos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gastos-documentos');

-- Política para permitir leer archivos de gastos-documentos (público)
CREATE POLICY "Todos pueden ver archivos de gastos-documentos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'gastos-documentos');

-- Verificar buckets creados
SELECT * FROM storage.buckets WHERE name IN ('compras-documentos', 'gastos-documentos');
