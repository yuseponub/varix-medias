-- Renombrar tabla gastos_hormigas a gastos_extra
ALTER TABLE gastos_hormigas RENAME TO gastos_extra;

-- Renombrar índice
ALTER INDEX idx_gastos_fecha RENAME TO idx_gastos_extra_fecha;
ALTER INDEX idx_gastos_estado RENAME TO idx_gastos_extra_estado;

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver gastos" ON gastos_extra;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear gastos" ON gastos_extra;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar gastos" ON gastos_extra;

-- Recrear políticas con nuevos nombres
CREATE POLICY "Usuarios autenticados pueden ver gastos extra"
  ON gastos_extra FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear gastos extra"
  ON gastos_extra FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar gastos extra"
  ON gastos_extra FOR UPDATE
  TO authenticated
  USING (true);

-- Eliminar trigger antiguo y recrearlo
DROP TRIGGER IF EXISTS update_gastos_updated_at ON gastos_extra;

CREATE TRIGGER update_gastos_extra_updated_at BEFORE UPDATE ON gastos_extra
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verificar que el cambio se hizo correctamente
SELECT 'Gastos Extra:', COUNT(*) FROM gastos_extra;
