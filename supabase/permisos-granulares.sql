-- ============================================
-- SISTEMA DE PERMISOS GRANULARES
-- ============================================

-- Crear tabla de permisos de usuario
CREATE TABLE IF NOT EXISTS permisos_usuario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Permisos de Ventas
  puede_ver_ventas BOOLEAN DEFAULT TRUE,
  puede_registrar_ventas BOOLEAN DEFAULT TRUE,
  puede_eliminar_ventas BOOLEAN DEFAULT FALSE,
  puede_ver_devoluciones BOOLEAN DEFAULT TRUE,
  puede_registrar_devoluciones BOOLEAN DEFAULT TRUE,
  puede_aprobar_devoluciones BOOLEAN DEFAULT FALSE,

  -- Permisos de Compras
  puede_ver_compras BOOLEAN DEFAULT FALSE,
  puede_registrar_compras BOOLEAN DEFAULT FALSE,
  puede_aprobar_compras BOOLEAN DEFAULT FALSE,
  puede_registrar_gastos BOOLEAN DEFAULT FALSE,
  puede_aprobar_gastos BOOLEAN DEFAULT FALSE,

  -- Permisos de Inventario
  puede_ver_inventario BOOLEAN DEFAULT TRUE,
  puede_editar_inventario BOOLEAN DEFAULT FALSE,
  puede_ver_movimientos BOOLEAN DEFAULT FALSE,

  -- Permisos de Efectivo
  puede_ver_efectivo BOOLEAN DEFAULT FALSE,
  puede_recoger_efectivo BOOLEAN DEFAULT FALSE,
  puede_hacer_cierre_caja BOOLEAN DEFAULT FALSE,

  -- Permisos de Reportes/Historial
  puede_ver_dashboard BOOLEAN DEFAULT TRUE,
  puede_ver_historial BOOLEAN DEFAULT FALSE,

  -- Permisos de Administración
  puede_gestionar_usuarios BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX idx_permisos_usuario ON permisos_usuario(usuario_id);

-- Crear permisos por defecto para usuarios existentes
-- Para ADMIN: todos los permisos
INSERT INTO permisos_usuario (
  usuario_id,
  puede_ver_ventas, puede_registrar_ventas, puede_eliminar_ventas,
  puede_ver_devoluciones, puede_registrar_devoluciones, puede_aprobar_devoluciones,
  puede_ver_compras, puede_registrar_compras, puede_aprobar_compras,
  puede_registrar_gastos, puede_aprobar_gastos,
  puede_ver_inventario, puede_editar_inventario, puede_ver_movimientos,
  puede_ver_efectivo, puede_recoger_efectivo, puede_hacer_cierre_caja,
  puede_ver_dashboard, puede_ver_historial,
  puede_gestionar_usuarios
)
SELECT
  id,
  TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE,
  TRUE, TRUE,
  TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE,
  TRUE, TRUE,
  TRUE
FROM usuarios
WHERE rol = 'admin'
ON CONFLICT (usuario_id) DO NOTHING;

-- Para VENDEDOR: permisos básicos (solo ventas)
INSERT INTO permisos_usuario (
  usuario_id,
  puede_ver_ventas, puede_registrar_ventas, puede_eliminar_ventas,
  puede_ver_devoluciones, puede_registrar_devoluciones, puede_aprobar_devoluciones,
  puede_ver_compras, puede_registrar_compras, puede_aprobar_compras,
  puede_registrar_gastos, puede_aprobar_gastos,
  puede_ver_inventario, puede_editar_inventario, puede_ver_movimientos,
  puede_ver_efectivo, puede_recoger_efectivo, puede_hacer_cierre_caja,
  puede_ver_dashboard, puede_ver_historial,
  puede_gestionar_usuarios
)
SELECT
  id,
  TRUE, TRUE, FALSE,
  TRUE, TRUE, FALSE,
  FALSE, FALSE, FALSE,
  FALSE, FALSE,
  TRUE, FALSE, FALSE,
  FALSE, FALSE, FALSE,
  TRUE, FALSE,
  FALSE
FROM usuarios
WHERE rol = 'vendedor'
ON CONFLICT (usuario_id) DO NOTHING;

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_permisos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp
CREATE TRIGGER trigger_permisos_updated_at
BEFORE UPDATE ON permisos_usuario
FOR EACH ROW
EXECUTE FUNCTION update_permisos_updated_at();

-- Función para crear permisos por defecto al crear un usuario
CREATE OR REPLACE FUNCTION crear_permisos_default()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rol = 'admin' THEN
    INSERT INTO permisos_usuario (
      usuario_id,
      puede_ver_ventas, puede_registrar_ventas, puede_eliminar_ventas,
      puede_ver_devoluciones, puede_registrar_devoluciones, puede_aprobar_devoluciones,
      puede_ver_compras, puede_registrar_compras, puede_aprobar_compras,
      puede_registrar_gastos, puede_aprobar_gastos,
      puede_ver_inventario, puede_editar_inventario, puede_ver_movimientos,
      puede_ver_efectivo, puede_recoger_efectivo, puede_hacer_cierre_caja,
      puede_ver_dashboard, puede_ver_historial,
      puede_gestionar_usuarios
    ) VALUES (
      NEW.id,
      TRUE, TRUE, TRUE,
      TRUE, TRUE, TRUE,
      TRUE, TRUE, TRUE,
      TRUE, TRUE,
      TRUE, TRUE, TRUE,
      TRUE, TRUE, TRUE,
      TRUE, TRUE,
      TRUE
    );
  ELSE
    -- Vendedor con permisos básicos
    INSERT INTO permisos_usuario (
      usuario_id,
      puede_ver_ventas, puede_registrar_ventas, puede_eliminar_ventas,
      puede_ver_devoluciones, puede_registrar_devoluciones, puede_aprobar_devoluciones,
      puede_ver_compras, puede_registrar_compras, puede_aprobar_compras,
      puede_registrar_gastos, puede_aprobar_gastos,
      puede_ver_inventario, puede_editar_inventario, puede_ver_movimientos,
      puede_ver_efectivo, puede_recoger_efectivo, puede_hacer_cierre_caja,
      puede_ver_dashboard, puede_ver_historial,
      puede_gestionar_usuarios
    ) VALUES (
      NEW.id,
      TRUE, TRUE, FALSE,
      TRUE, TRUE, FALSE,
      FALSE, FALSE, FALSE,
      FALSE, FALSE,
      TRUE, FALSE, FALSE,
      FALSE, FALSE, FALSE,
      TRUE, FALSE,
      FALSE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear permisos al crear usuario
DROP TRIGGER IF EXISTS trigger_crear_permisos ON usuarios;
CREATE TRIGGER trigger_crear_permisos
AFTER INSERT ON usuarios
FOR EACH ROW
EXECUTE FUNCTION crear_permisos_default();

COMMENT ON TABLE permisos_usuario IS 'Permisos granulares para cada usuario del sistema';
