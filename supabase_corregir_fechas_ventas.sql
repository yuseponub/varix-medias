-- Script para corregir las fechas de las ventas del 17 al 18 de enero 2025
-- Ejecutar este script en Supabase SQL Editor

-- Actualizar las ventas que tienen fecha '2025-01-17' a '2025-01-18'
UPDATE ventas
SET fecha = '2025-01-18'
WHERE fecha = '2025-01-17';

-- Verificar las ventas actualizadas
SELECT id, fecha, hora, total, metodo_pago, nombre_cliente
FROM ventas
ORDER BY fecha DESC, hora DESC
LIMIT 10;
