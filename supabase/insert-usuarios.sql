-- Insertar usuarios en la tabla usuarios
-- Ejecutar este SQL después del schema.sql

INSERT INTO usuarios (auth_id, nombre, email, rol, activo)
VALUES
  ('83015f4c-6aa1-4929-97ea-d4167c7b09dd', 'José Romero', 'jose.romero@varixcenter.com', 'admin', true),
  ('6a62c998-5031-44ed-9561-2c0a128fa3bd', 'Enfermera Varix', 'enfermera@varixcenter.com', 'vendedor', true)
ON CONFLICT (auth_id) DO NOTHING;

-- Verificar que se insertaron correctamente
SELECT * FROM usuarios;
