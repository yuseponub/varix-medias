-- ============================================
-- FIX RLS para permitir login
-- ============================================
-- Este script arregla las políticas RLS para que el login funcione

-- Eliminar política problemática
DROP POLICY IF EXISTS "Usuarios pueden ver su info" ON usuarios;

-- Crear política simple que funciona
CREATE POLICY "Usuarios autenticados pueden ver su propia info"
ON usuarios
FOR SELECT
TO authenticated
USING (auth_id = auth.uid());

-- También permitir que todos los usuarios autenticados vean todos los usuarios
-- (necesario para funcionalidad de vendedores viendo otros vendedores)
CREATE POLICY "Usuarios autenticados pueden ver todos los usuarios"
ON usuarios
FOR SELECT
TO authenticated
USING (true);
