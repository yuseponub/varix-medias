# 🎯 INSTRUCCIONES FINALES - VARIX MEDIAS

## ✅ Ya Completado Automáticamente:

- ✅ Storage buckets creados (5)
- ✅ Usuarios de Auth creados (2)
  - Admin: jose.romero@varixcenter.com / VarixAdmin2026!
  - Vendedor: enfermera@varixcenter.com / VarixVendedor2026!

## 📝 LO QUE FALTA (Solo 1 paso):

### Ejecutar el Schema SQL en Supabase

1. **Abrir Supabase:**
   - Ve a: https://supabase.com/dashboard/project/mrpxtfoykpagjgzeyyrt

2. **Ir al SQL Editor:**
   - En el menú lateral izquierdo, busca el ícono `</>` o "SQL Editor"
   - Click en "SQL Editor"

3. **Nueva Query:**
   - Click en "+ New query" (botón verde arriba a la derecha)

4. **Copiar el Schema:**
   - Abre el archivo: `c:\Users\Usuario\Proyectos\varix-medias\supabase\schema.sql`
   - Selecciona TODO el contenido (Ctrl+A)
   - Copia (Ctrl+C)

5. **Pegar y Ejecutar:**
   - Pega en el editor de Supabase (Ctrl+V)
   - Click en "RUN" (botón verde abajo a la derecha)
   - Espera 10-15 segundos a que termine

6. **Verificar:**
   - Deberías ver "Success" en verde
   - Si ves algún error, es probablemente porque algo ya existe (no problem

a)

## 🚀 Probar el Sistema:

Después de ejecutar el schema.sql:

1. **Iniciar el servidor:**
   ```bash
   cd c:\Users\Usuario\Proyectos\varix-medias
   npm run dev
   ```

2. **Abrir en el navegador:**
   - http://localhost:3000

3. **Login como Admin:**
   - Email: `jose.romero@varixcenter.com`
   - Password: `VarixAdmin2026!`

4. **Deberías ver:**
   - Dashboard con métricas
   - Efectivo en caja: $0
   - Ventas hoy: $0
   - Inventario: 11 productos

## 🔐 Usuarios Creados:

| Rol | Email | Password | User ID |
|-----|-------|----------|---------|
| Admin | jose.romero@varixcenter.com | VarixAdmin2026! | 83015f4c-6aa1-4929-97ea-d4167c7b09dd |
| Vendedor | enfermera@varixcenter.com | VarixVendedor2026! | 6a62c998-5031-44ed-9561-2c0a128fa3bd |

**⚠️ IMPORTANTE:** Después del primer login, cambia estas contraseñas.

## 📦 Storage Buckets Creados:

1. `recibos-ventas` - Para fotos de recibos de venta
2. `comprobantes-pago` - Para comprobantes de tarjeta/transferencia
3. `facturas-compras` - Para facturas de proveedores
4. `devoluciones` - Para fotos de devoluciones
5. `efectivo` - Para fotos de efectivo recogido

Todos son públicos para facilitar visualización.

## ⚠️ Si el Schema falla:

Si al ejecutar el schema.sql ves errores, pueden ser por:

1. **"already exists"** - Ignorar, significa que algo ya está creado
2. **"permission denied"** - Verificar que estés usando el proyecto correcto
3. **Otro error** - Copia el error y me lo pasas

## 📱 Próximos Pasos de Desarrollo:

Una vez que pruebes el login y veas el dashboard, los siguientes módulos a implementar serán:

1. ✅ Gestión de Inventario (ver/editar medias)
2. ✅ Registro de Ventas con OCR
3. ✅ Sistema de Devoluciones
4. ✅ Compras de Medias
5. ✅ Recogida de Efectivo
6. ✅ Reportes

---

**¿Tienes algún problema? Déjame saber y te ayudo a resolverlo.**
