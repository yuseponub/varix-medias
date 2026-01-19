-- Ver la estructura real de la tabla productos
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'productos'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver un producto de ejemplo con todos sus campos
SELECT * FROM productos LIMIT 1;
