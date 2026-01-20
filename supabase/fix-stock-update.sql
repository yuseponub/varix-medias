-- ============================================
-- FIX: Permitir a vendedores actualizar stock
-- ============================================
-- Este script crea una función RPC con SECURITY DEFINER
-- que permite actualizar el stock sin restricciones de RLS

-- 1. Crear función para decrementar stock (ventas)
CREATE OR REPLACE FUNCTION decrementar_stock_producto(
  p_producto_id UUID,
  p_cantidad INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER  -- Ejecuta con permisos del creador (admin)
SET search_path = public
AS $$
BEGIN
  UPDATE productos
  SET stock_normal = stock_normal - p_cantidad
  WHERE id = p_producto_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado: %', p_producto_id;
  END IF;
END;
$$;

-- 2. Crear función para incrementar stock (devoluciones/compras)
CREATE OR REPLACE FUNCTION incrementar_stock_producto(
  p_producto_id UUID,
  p_cantidad INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE productos
  SET stock_normal = stock_normal + p_cantidad
  WHERE id = p_producto_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado: %', p_producto_id;
  END IF;
END;
$$;

-- 3. Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION decrementar_stock_producto(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION incrementar_stock_producto(UUID, INTEGER) TO authenticated;

-- ============================================
-- ACTUALIZAR PRECIOS DE PRODUCTOS
-- ============================================
-- Rodilla: $145
-- Panty: $190
-- Muslo: $175

UPDATE productos SET precio_venta = 145 WHERE tipo = 'rodilla';
UPDATE productos SET precio_venta = 190 WHERE tipo = 'panty';
UPDATE productos SET precio_venta = 175 WHERE tipo = 'muslo';

-- Verificar los cambios
SELECT codigo, tipo, talla, precio_venta, stock_normal
FROM productos
ORDER BY tipo, talla;
