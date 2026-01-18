-- ============================================
-- AGREGAR NUEVO USUARIO ADMIN
-- ============================================
-- Ejecutar DESPUÉS de crear el usuario en Supabase Auth
-- Reemplaza 'TU_AUTH_UID_AQUI' con el UID real del usuario

-- Insertar nuevo usuario admin
INSERT INTO usuarios (auth_id, nombre, email, rol, activo)
VALUES
  ('TU_AUTH_UID_AQUI', 'José Romero', 'joseromerorincon041100@gmail.com', 'admin', true)
ON CONFLICT (auth_id) DO NOTHING;

-- Verificar que se insertó correctamente
SELECT * FROM usuarios WHERE email = 'joseromerorincon041100@gmail.com';
