-- ============================================
-- FUNCIONES PARA ELIMINAR VENTAS
-- ============================================

-- Función para incrementar stock de un producto
CREATE OR REPLACE FUNCTION incrementar_stock_producto(
  p_producto_id UUID,
  p_cantidad INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE productos
  SET stock_normal = stock_normal + p_cantidad
  WHERE id = p_producto_id;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar saldo de caja (puede ser positivo o negativo)
CREATE OR REPLACE FUNCTION actualizar_saldo_caja(
  p_monto DECIMAL
)
RETURNS VOID AS $$
BEGIN
  UPDATE caja_efectivo
  SET saldo_actual = saldo_actual + p_monto
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION incrementar_stock_producto IS 'Incrementa el stock de un producto (usado al eliminar ventas)';
COMMENT ON FUNCTION actualizar_saldo_caja IS 'Actualiza el saldo de caja (positivo o negativo)';
