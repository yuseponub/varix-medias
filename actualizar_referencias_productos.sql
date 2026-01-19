-- ========================================
-- ACTUALIZAR REFERENCIAS EN PRODUCTOS
-- ========================================

-- Este script actualiza el campo 'codigo' de cada producto
-- para incluir la referencia numérica correcta

-- 1. Ver productos actuales antes de actualizar
SELECT id, codigo, tipo, talla, stock_normal
FROM productos
ORDER BY tipo, talla;

-- 2. MUSLO - Referencias 74113 a 74116
UPDATE productos
SET codigo = '74113'
WHERE tipo = 'muslo' AND talla = 'M';

UPDATE productos
SET codigo = '74114'
WHERE tipo = 'muslo' AND talla = 'L';

UPDATE productos
SET codigo = '74115'
WHERE tipo = 'muslo' AND talla = 'XL';

UPDATE productos
SET codigo = '74116'
WHERE tipo = 'muslo' AND talla = 'XXL';

-- 3. PANTY - Referencias 75406 a 75409
UPDATE productos
SET codigo = '75406'
WHERE tipo = 'panty' AND talla = 'M';

UPDATE productos
SET codigo = '75407'
WHERE tipo = 'panty' AND talla = 'L';

UPDATE productos
SET codigo = '75408'
WHERE tipo = 'panty' AND talla = 'XL';

UPDATE productos
SET codigo = '75409'
WHERE tipo = 'panty' AND talla = 'XXL';

-- 4. RODILLA - Referencias 79321 a 79323
UPDATE productos
SET codigo = '79321'
WHERE tipo = 'rodilla' AND talla = 'M';

UPDATE productos
SET codigo = '79322'
WHERE tipo = 'rodilla' AND talla = 'L';

UPDATE productos
SET codigo = '79323'
WHERE tipo = 'rodilla' AND talla = 'XL';

-- 5. Ver productos después de actualizar
SELECT id, codigo, tipo, talla, stock_normal
FROM productos
ORDER BY tipo, talla;

-- 6. Verificar que todas las referencias están correctas
SELECT
  CASE
    WHEN tipo = 'muslo' AND talla = 'M' AND codigo = '74113' THEN '✅'
    WHEN tipo = 'muslo' AND talla = 'L' AND codigo = '74114' THEN '✅'
    WHEN tipo = 'muslo' AND talla = 'XL' AND codigo = '74115' THEN '✅'
    WHEN tipo = 'muslo' AND talla = 'XXL' AND codigo = '74116' THEN '✅'
    WHEN tipo = 'panty' AND talla = 'M' AND codigo = '75406' THEN '✅'
    WHEN tipo = 'panty' AND talla = 'L' AND codigo = '75407' THEN '✅'
    WHEN tipo = 'panty' AND talla = 'XL' AND codigo = '75408' THEN '✅'
    WHEN tipo = 'panty' AND talla = 'XXL' AND codigo = '75409' THEN '✅'
    WHEN tipo = 'rodilla' AND talla = 'M' AND codigo = '79321' THEN '✅'
    WHEN tipo = 'rodilla' AND talla = 'L' AND codigo = '79322' THEN '✅'
    WHEN tipo = 'rodilla' AND talla = 'XL' AND codigo = '79323' THEN '✅'
    ELSE '❌'
  END AS estado,
  codigo,
  tipo,
  talla
FROM productos
ORDER BY tipo, talla;
