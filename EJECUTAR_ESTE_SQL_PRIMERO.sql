-- ========================================
-- PASO 1: PREPARAR TABLAS PARA COMPRAS
-- ========================================
-- Este script prepara la base de datos para el nuevo sistema de compras

-- 1. Verificar si existe la tabla compras vieja
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'compras'
) AS tabla_compras_existe;

-- 2. Ver estructura actual de compras (si existe)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'compras'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. RENOMBRAR tablas viejas si existen (como backup)
-- Solo ejecuta esto si quieres guardar los datos viejos
-- Si no tienes datos importantes en las tablas viejas, puedes hacer DROP TABLE en su lugar

-- Opción A: Renombrar para hacer backup (RECOMENDADO si hay datos)
-- ALTER TABLE IF EXISTS compras RENAME TO compras_old;
-- ALTER TABLE IF EXISTS compras_detalle RENAME TO compras_detalle_old;

-- Opción B: Eliminar tablas viejas (SOLO si no hay datos importantes)
DROP TABLE IF EXISTS compras_detalle CASCADE;
DROP TABLE IF EXISTS compras CASCADE;

-- 4. Ahora ejecuta el contenido de supabase_crear_tablas_compras.sql
-- (Copia y pega TODO el contenido de ese archivo aquí)
